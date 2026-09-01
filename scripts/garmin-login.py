#!/usr/bin/env python3
"""Mint Garmin DI OAuth2 tokens locally with python-garminconnect ≥ 0.3.

Node fetch SSO (mobile JSON / widget HTML) no longer works against Garmin's
post-March-2026 auth without curl_cffi TLS impersonation — which we refuse to
ship inside the Next.js / Vercel app. Mint tokens on your machine, then import
them into Sharpit (UI paste or CLI). Cron only refreshes stored DI tokens.

Install (once):
  pip install -r scripts/requirements-garmin.txt
  # or: pip install 'garminconnect>=0.3' curl_cffi

Usage:
  GARMIN_EMAIL=you@example.com GARMIN_PASSWORD='…' python3 scripts/garmin-login.py
  python3 scripts/garmin-login.py   # prompts; password is never printed

Output:
  ./garmin_tokens.json  (mode 0600) — python-garminconnect tokenstore shape:
  { "di_token", "di_refresh_token", "di_client_id" }

Then import into Sharpit (encrypts with THIS environment's SECRET_ENCRYPTION_KEY):
  yarn garmin:import-tokens ./garmin_tokens.json
  # or paste the JSON in Settings → Applications → Garmin
"""

from __future__ import annotations

import json
import os
import sys
from getpass import getpass
from pathlib import Path

try:
    from garminconnect import (
        Garmin,
        GarminConnectAuthenticationError,
        GarminConnectConnectionError,
        GarminConnectTooManyRequestsError,
    )
except ImportError:
    print(
        "Missing dependency. Install with:\n"
        "  pip install -r scripts/requirements-garmin.txt\n"
        "  # requires garminconnect>=0.3 and curl_cffi",
        file=sys.stderr,
    )
    sys.exit(1)


def main() -> int:
    out = Path(os.environ.get("GARMIN_TOKENS_OUT", "garmin_tokens.json")).expanduser()
    if out.suffix.casefold() != ".json":
        out = out / "garmin_tokens.json"

    email = (os.environ.get("GARMIN_EMAIL") or input("Garmin email: ")).strip()
    password = os.environ.get("GARMIN_PASSWORD")
    if not password:
        password = getpass("Garmin password: ")
    if not email or not password:
        print("Email and password are required.", file=sys.stderr)
        return 1

    def prompt_mfa() -> str:
        return input("MFA code: ").strip()

    try:
        client = Garmin(email=email, password=password, prompt_mfa=prompt_mfa)
        # Do not keep the plaintext password in local scope longer than needed.
        password = None
        # login(tokenstore) runs the ≥0.3 strategy chain (incl. widget+cffi) and
        # persists DI tokens under the given path.
        client.login(str(out))
    except GarminConnectTooManyRequestsError as err:
        print(f"Rate limited by Garmin: {err}", file=sys.stderr)
        return 1
    except GarminConnectAuthenticationError as err:
        print(f"Authentication failed: {err}", file=sys.stderr)
        return 1
    except GarminConnectConnectionError as err:
        print(f"Connection error: {err}", file=sys.stderr)
        return 1

    # Ensure the advertised file exists even if the library wrote a sibling path.
    payload = client.dumps()
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(payload, encoding="utf-8")
    try:
        out.chmod(0o600)
    except OSError:
        pass

    data = json.loads(payload)
    has_access = bool(data.get("di_token"))
    has_refresh = bool(data.get("di_refresh_token"))
    client_id = data.get("di_client_id") or "(from JWT)"
    print(f"Wrote {out.resolve()}")
    print(f"  di_token: {'yes' if has_access else 'MISSING'}")
    print(f"  di_refresh_token: {'yes' if has_refresh else 'MISSING'}")
    print(f"  di_client_id: {client_id}")
    print()
    print("Import into Sharpit (do not commit this file):")
    print(f"  yarn garmin:import-tokens {out}")
    print("  # or paste the JSON in Settings → Applications → Garmin")
    if not has_access or not has_refresh:
        print("Token file incomplete — login likely failed.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
