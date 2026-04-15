#!/usr/bin/env python3
"""DashScope OpenAI-compatible client routed through the Windows host."""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import tempfile
from copy import deepcopy
from pathlib import Path
from typing import Any, Callable

from scripts.common.env import load_project_env

DEFAULT_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1"


class QwenOpenAIClientError(RuntimeError):
    """Raised when the Windows-host Qwen wrapper cannot complete a request."""


def get_dashscope_api_key(env: dict[str, str] | None = None) -> str:
    scope = env if env is not None else os.environ
    key = scope.get("DASHSCOPE_API_KEY")
    if not key:
        raise QwenOpenAIClientError("DASHSCOPE_API_KEY is required")
    return key


def to_windows_path(
    path: str | Path,
    runner: Callable[..., Any] = subprocess.run,
) -> str:
    result = runner(
        ["wslpath", "-w", str(path)],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        raise QwenOpenAIClientError(
            f"Failed to convert WSL path to Windows path: {result.stderr.strip() or result.stdout.strip()}",
        )
    return result.stdout.strip()


def normalize_request_for_windows_host(
    request: dict[str, Any],
    path_converter: Callable[[str | Path], str] = to_windows_path,
) -> dict[str, Any]:
    normalized = deepcopy(request)

    for message in normalized.get("messages", []):
        content = message.get("content")
        if not isinstance(content, list):
            continue
        for part in content:
            if (
                isinstance(part, dict)
                and part.get("type") == "image_path"
                and part.get("image_path")
            ):
                part["image_path"] = path_converter(part["image_path"])

    return normalized


def bind_path_converter(
    runner: Callable[..., Any],
    path_converter: Callable[[str | Path], str] | None = None,
) -> Callable[[str | Path], str]:
    if path_converter is not None:
        return path_converter

    def _convert(path: str | Path) -> str:
        return to_windows_path(path, runner=runner)

    return _convert


def build_powershell_command(
    *,
    script_path: str,
    request_path: str,
    base_url: str = DEFAULT_BASE_URL,
) -> list[str]:
    return [
        "powershell.exe",
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        script_path,
        request_path,
        base_url,
    ]


def build_powershell_script() -> str:
    return r"""
param(
  [string]$RequestPath,
  [string]$BaseUrl
)

$ErrorActionPreference = 'Stop'
$request = Get-Content -Raw -Path $RequestPath | ConvertFrom-Json

function Convert-ImagePathToPart($part) {
  if ($null -eq $part) { return $null }
  if ($part.type -ne 'image_path') { return $part }

  $imagePath = [string]$part.image_path
  $bytes = [System.IO.File]::ReadAllBytes($imagePath)
  $extension = [System.IO.Path]::GetExtension($imagePath).ToLowerInvariant()
  $mediaType = switch ($extension) {
    '.jpg' { 'image/jpeg' }
    '.jpeg' { 'image/jpeg' }
    '.webp' { 'image/webp' }
    default { 'image/png' }
  }

  return @{
    type = 'image_url'
    image_url = @{
      url = ('data:' + $mediaType + ';base64,' + [Convert]::ToBase64String($bytes))
    }
  }
}

$normalizedMessages = @()
foreach ($message in $request.messages) {
  $content = $message.content
  if ($content -is [System.Array]) {
    $normalizedContent = @()
    foreach ($part in $content) {
      $normalizedContent += @(Convert-ImagePathToPart $part)
    }
    $content = $normalizedContent
  }

  $normalizedMessages += @(@{
    role = [string]$message.role
    content = $content
  })
}

$body = @{
  model = [string]$request.model
  messages = $normalizedMessages
}

if ($request.PSObject.Properties.Name -contains 'max_tokens') {
  $body.max_tokens = $request.max_tokens
}
if ($request.PSObject.Properties.Name -contains 'temperature') {
  $body.temperature = $request.temperature
}
if ($request.PSObject.Properties.Name -contains 'enable_thinking') {
  $body.enable_thinking = $request.enable_thinking
}
if ($request.PSObject.Properties.Name -contains 'response_format') {
  $body.response_format = $request.response_format
}

$headers = @{
  Authorization = ('Bearer ' + $env:DASHSCOPE_API_KEY)
  'Content-Type' = 'application/json'
}

$response = Invoke-RestMethod `
  -Uri ($BaseUrl.TrimEnd('/') + '/chat/completions') `
  -Method Post `
  -Headers $headers `
  -Body ($body | ConvertTo-Json -Depth 100 -Compress) `
  -TimeoutSec 90

$response | ConvertTo-Json -Depth 100 -Compress
""".strip()


def call_qwen_openai_v1(
    request: dict[str, Any],
    *,
    env: dict[str, str] | None = None,
    runner: Callable[..., Any] = subprocess.run,
    path_converter: Callable[[str | Path], str] | None = None,
    base_url: str = DEFAULT_BASE_URL,
    timeout: int = 90,
    temp_dir: str | Path | None = None,
) -> dict[str, Any]:
    if env is None:
        load_project_env()
    base_env = dict(env if env is not None else os.environ)
    api_key = get_dashscope_api_key(base_env)
    effective_path_converter = bind_path_converter(runner, path_converter)

    normalized_request = normalize_request_for_windows_host(
        request,
        path_converter=effective_path_converter,
    )

    with tempfile.NamedTemporaryFile(
        mode="w",
        suffix=".json",
        prefix="qwen-openai-request-",
        dir=temp_dir,
        delete=False,
        encoding="utf-8",
    ) as handle:
        json.dump(normalized_request, handle, ensure_ascii=False)
        request_path = Path(handle.name)

    with tempfile.NamedTemporaryFile(
        mode="w",
        suffix=".ps1",
        prefix="qwen-openai-runner-",
        dir=temp_dir,
        delete=False,
        encoding="utf-8",
    ) as handle:
        handle.write(build_powershell_script())
        script_path = Path(handle.name)

    try:
        windows_request_path = effective_path_converter(request_path)
        windows_script_path = effective_path_converter(script_path)
        command = build_powershell_command(
            script_path=windows_script_path,
            request_path=windows_request_path,
            base_url=base_url,
        )
        command_env = {**base_env, "DASHSCOPE_API_KEY": api_key}
        result = runner(
            command,
            capture_output=True,
            text=True,
            env=command_env,
            timeout=timeout,
            check=False,
        )
    finally:
        request_path.unlink(missing_ok=True)
        script_path.unlink(missing_ok=True)

    if result.returncode != 0:
        raise QwenOpenAIClientError(
            result.stderr.strip()
            or result.stdout.strip()
            or "Windows-host Qwen request failed",
        )

    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError as error:
        raise QwenOpenAIClientError(
            f"Windows-host Qwen request returned non-JSON stdout: {result.stdout[:200]}",
        ) from error


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Call DashScope OpenAI-compatible Qwen API through Windows PowerShell.",
    )
    parser.add_argument("--model", required=True)
    parser.add_argument("--text")
    parser.add_argument("--image-path")
    parser.add_argument("--max-tokens", type=int, default=256)
    parser.add_argument("--temperature", type=float, default=0.0)
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--enable-thinking", action="store_true")
    parser.add_argument("--json-object", action="store_true")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)

    if not args.text and not args.image_path:
        print("Provide --text or --image-path", file=sys.stderr)
        return 4

    if args.image_path:
        content: Any = []
        if args.text:
            content.append({"type": "text", "text": args.text})
        content.append({"type": "image_path", "image_path": args.image_path})
    else:
        content = args.text

    request: dict[str, Any] = {
        "model": args.model,
        "messages": [{"role": "user", "content": content}],
        "max_tokens": args.max_tokens,
        "temperature": args.temperature,
        "enable_thinking": args.enable_thinking,
    }
    if args.json_object:
        request["response_format"] = {"type": "json_object"}

    response = call_qwen_openai_v1(request, base_url=args.base_url)
    print(json.dumps(response, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
