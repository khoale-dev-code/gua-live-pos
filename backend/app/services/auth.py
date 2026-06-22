import base64
import hashlib
import hmac
import json
import os
import time
from typing import Any

from dotenv import load_dotenv

load_dotenv(".env")

AUTH_SECRET_KEY = os.getenv("AUTH_SECRET_KEY", "change-me")
AUTH_TOKEN_EXPIRE_HOURS = int(os.getenv("AUTH_TOKEN_EXPIRE_HOURS", "168"))


class AuthError(Exception):
    pass


def b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def sign_payload(payload_text: str) -> str:
    signature = hmac.new(
        AUTH_SECRET_KEY.encode("utf-8"),
        payload_text.encode("utf-8"),
        hashlib.sha256,
    ).digest()

    return b64url_encode(signature)


def create_access_token(username: str) -> str:
    now = int(time.time())

    payload: dict[str, Any] = {
        "sub": username,
        "iat": now,
        "exp": now + AUTH_TOKEN_EXPIRE_HOURS * 3600,
    }

    payload_text = b64url_encode(
        json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    )

    signature = sign_payload(payload_text)

    return f"{payload_text}.{signature}"


def verify_access_token(token: str | None) -> dict[str, Any]:
    if not token:
        raise AuthError("Missing token")

    try:
        payload_text, signature = token.split(".", 1)
    except ValueError as exc:
        raise AuthError("Invalid token") from exc

    expected_signature = sign_payload(payload_text)

    if not hmac.compare_digest(signature, expected_signature):
        raise AuthError("Invalid token signature")

    try:
        payload = json.loads(b64url_decode(payload_text).decode("utf-8"))
    except Exception as exc:
        raise AuthError("Invalid token payload") from exc

    if int(payload.get("exp", 0)) < int(time.time()):
        raise AuthError("Token expired")

    return payload
