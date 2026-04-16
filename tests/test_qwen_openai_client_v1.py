from __future__ import annotations

import os
import sys
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.vlm.qwen_openai_client_v1 import (  # noqa: E402
    DEFAULT_BASE_URL,
    build_powershell_command,
    build_powershell_script,
    call_qwen_openai_v1,
    main,
    normalize_request_for_windows_host,
)


def test_normalize_request_converts_image_paths_for_windows_host():
    request = {
        "model": "qwen-vl-ocr",
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "read the image"},
                    {"type": "image_path", "image_path": "/home/samsen/code/cie-assets/test.png"},
                ],
            }
        ],
    }

    normalized = normalize_request_for_windows_host(
        request,
        path_converter=lambda value: f"WIN::{value}",
    )

    assert normalized["messages"][0]["content"][1] == {
        "type": "image_path",
        "image_path": "WIN::/home/samsen/code/cie-assets/test.png",
    }


def test_build_powershell_command_targets_dashscope_chat_completions():
    command = build_powershell_command(
        script_path="C:\\temp\\invoke-qwen.ps1",
        request_path="C:\\temp\\request.json",
        base_url=DEFAULT_BASE_URL,
    )

    assert command[0] == "powershell.exe"
    assert "-NoProfile" in command
    assert "-ExecutionPolicy" in command
    assert "Bypass" in command
    assert "-File" in command
    assert command[-2:] == ["C:\\temp\\request.json", DEFAULT_BASE_URL]


def test_build_powershell_script_supports_machine_consumable_fields():
    script = build_powershell_script()

    assert "enable_thinking" in script
    assert "response_format" in script
    assert "ConvertTo-Json -Depth 100 -Compress" in script


def test_build_powershell_script_forces_utf8_console_and_request_reading():
    script = build_powershell_script()

    assert "UTF8Encoding" in script
    assert "OutputEncoding" in script
    assert "Get-Content -Raw -Encoding UTF8" in script
    assert "Add-Type -AssemblyName System.Net.Http" in script
    assert "ReadAsByteArrayAsync" in script
    assert "UTF8.GetString" in script


def test_call_qwen_openai_v1_invokes_powershell_and_parses_json_response(tmp_path):
    captured = {}

    def fake_runner(cmd, *, capture_output, text, env=None, timeout=None, check=False):
        if cmd[0] == "wslpath":
            return SimpleNamespace(
                returncode=0,
                stdout=f"WIN::{cmd[-1]}",
                stderr="",
            )
        captured["cmd"] = cmd
        captured["env"] = env
        captured["timeout"] = timeout
        return SimpleNamespace(
            returncode=0,
            stdout=b'{"model":"qwen3.6-plus","choices":[{"message":{"content":"ok"}}]}',
            stderr=b"",
        )

    with patch(
        "scripts.vlm.qwen_openai_client_v1.get_dashscope_api_key",
        return_value="secret-key",
    ):
        response = call_qwen_openai_v1(
            {
                "model": "qwen3.6-plus",
                "messages": [{"role": "user", "content": "Reply with exactly: ok"}],
                "enable_thinking": False,
                "response_format": {"type": "json_object"},
            },
            runner=fake_runner,
            temp_dir=tmp_path,
        )

    assert response["choices"][0]["message"]["content"] == "ok"
    assert captured["env"]["DASHSCOPE_API_KEY"] == "secret-key"
    assert captured["cmd"][0] == "powershell.exe"
    assert captured["timeout"] == 90


def test_call_qwen_openai_v1_routes_path_conversion_through_injected_runner(tmp_path):
    commands = []

    def fake_runner(cmd, *, capture_output, text, env=None, timeout=None, check=False):
        commands.append(cmd)
        if cmd[0] == "wslpath":
            source = cmd[-1]
            return SimpleNamespace(returncode=0, stdout=f"WIN::{source}", stderr="")
        return SimpleNamespace(
            returncode=0,
            stdout=b'{"model":"qwen-vl-ocr","choices":[{"message":{"content":"ok"}}]}',
            stderr=b"",
        )

    with patch(
        "scripts.vlm.qwen_openai_client_v1.get_dashscope_api_key",
        return_value="secret-key",
    ):
        call_qwen_openai_v1(
            {
                "model": "qwen-vl-ocr",
                "messages": [{"role": "user", "content": "Reply with exactly: ok"}],
                "enable_thinking": False,
                "response_format": {"type": "json_object"},
            },
            runner=fake_runner,
            temp_dir=tmp_path,
        )

    assert [cmd[0] for cmd in commands[:2]] == ["wslpath", "wslpath"]
    assert commands[2][0] == "powershell.exe"
    assert commands[2][5].startswith("WIN::")
    assert commands[2][6].startswith("WIN::")


def test_call_qwen_openai_v1_honors_dashscope_api_key_loaded_from_dotenv(tmp_path, monkeypatch):
    captured = {"load_calls": 0}

    def fake_runner(cmd, *, capture_output, text, env=None, timeout=None, check=False):
        if cmd[0] == "wslpath":
            return SimpleNamespace(returncode=0, stdout=f"WIN::{cmd[-1]}", stderr="")
        captured["env"] = env
        return SimpleNamespace(
            returncode=0,
            stdout=b'{"model":"qwen-vl-ocr","choices":[{"message":{"content":"ok"}}]}',
            stderr=b"",
        )

    def fake_load_project_env():
        captured["load_calls"] += 1
        os.environ["DASHSCOPE_API_KEY"] = "dotenv-secret"

    monkeypatch.delenv("DASHSCOPE_API_KEY", raising=False)
    monkeypatch.setattr(
        "scripts.vlm.qwen_openai_client_v1.load_project_env",
        fake_load_project_env,
        raising=False,
    )

    response = call_qwen_openai_v1(
        {
            "model": "qwen-vl-ocr",
            "messages": [{"role": "user", "content": "Reply with exactly: ok"}],
            "enable_thinking": False,
            "response_format": {"type": "json_object"},
        },
        runner=fake_runner,
        temp_dir=tmp_path,
    )

    assert response["choices"][0]["message"]["content"] == "ok"
    assert captured["load_calls"] == 1
    assert captured["env"]["DASHSCOPE_API_KEY"] == "dotenv-secret"


def test_call_qwen_openai_v1_decodes_utf8_stdout_payloads(tmp_path):
    def fake_runner(cmd, *, capture_output, text, env=None, timeout=None, check=False):
        if cmd[0] == "wslpath":
            return SimpleNamespace(returncode=0, stdout=f"WIN::{cmd[-1]}", stderr="")
        payload = '{"model":"qwen3.6-plus","choices":[{"message":{"content":"π θ ≤ √ ∫"}}]}'
        return SimpleNamespace(returncode=0, stdout=payload.encode("utf-8"), stderr=b"")

    with patch(
        "scripts.vlm.qwen_openai_client_v1.get_dashscope_api_key",
        return_value="secret-key",
    ):
        response = call_qwen_openai_v1(
            {
                "model": "qwen3.6-plus",
                "messages": [{"role": "user", "content": "Reply with symbols"}],
                "enable_thinking": False,
                "response_format": {"type": "json_object"},
            },
            runner=fake_runner,
            temp_dir=tmp_path,
        )

    assert response["choices"][0]["message"]["content"] == "π θ ≤ √ ∫"


def test_main_builds_image_request_and_json_object_flag(capsys):
    with patch(
        "scripts.vlm.qwen_openai_client_v1.call_qwen_openai_v1",
        return_value={"model": "qwen-vl-ocr", "choices": [{"message": {"content": "{\"ok\":true}"}}]},
    ) as mock_call:
        exit_code = main([
            "--model",
            "qwen-vl-ocr",
            "--text",
            "Read the page",
            "--image-path",
            "/tmp/q01.png",
            "--json-object",
        ])

    assert exit_code == 0
    request = mock_call.call_args.args[0]
    assert request["model"] == "qwen-vl-ocr"
    assert request["enable_thinking"] is False
    assert request["response_format"] == {"type": "json_object"}
    assert request["messages"][0]["content"][1] == {
        "type": "image_path",
        "image_path": "/tmp/q01.png",
    }
    assert '\\"ok\\":true' in capsys.readouterr().out


def test_main_rejects_missing_user_content(capsys):
    exit_code = main(["--model", "qwen3.6-plus"])

    assert exit_code == 4
    assert "Provide --text or --image-path" in capsys.readouterr().err
