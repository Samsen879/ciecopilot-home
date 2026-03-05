"""Local-only safety guard for database and Supabase URLs."""
from __future__ import annotations

import os
import sys
from typing import Iterable
from urllib.parse import urlparse


LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1", "0.0.0.0"}


def _host_from_url(value: str | None) -> str | None:
    if not value:
        return None
    try:
        return urlparse(value).hostname
    except Exception:
        return None


def enforce_local(allow_remote: bool, env_keys: Iterable[str]) -> None:
    if allow_remote:
        print("WARNING: --allow-remote set; local-only guard disabled.", file=sys.stderr)
        return

    offenders: list[tuple[str, str]] = []
    for key in env_keys:
        val = os.environ.get(key)
        if not val:
            continue
        host = _host_from_url(val)
        if not host or host not in LOCAL_HOSTS:
            offenders.append((key, host or "unparseable"))

    if offenders:
        print("Error: remote target blocked by local-only guard.", file=sys.stderr)
        print("Use --allow-remote to override explicitly.", file=sys.stderr)
        for key, host in offenders:
            print(f"- {key}: {host}", file=sys.stderr)
        sys.exit(2)
