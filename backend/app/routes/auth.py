import os
from hmac import compare_digest

from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.services.auth import create_access_token

load_dotenv(".env")

router = APIRouter(prefix="/api/auth", tags=["Auth"])


class LoginPayload(BaseModel):
    username: str
    password: str


@router.post("/login")
def login(payload: LoginPayload):
    admin_username = os.getenv("ADMIN_USERNAME", "admin")
    admin_password = os.getenv("ADMIN_PASSWORD", "admin")

    username_ok = compare_digest(payload.username.strip(), admin_username)
    password_ok = compare_digest(payload.password, admin_password)

    if not username_ok or not password_ok:
        raise HTTPException(
            status_code=401,
            detail="Tài khoản hoặc mật khẩu không đúng.",
        )

    token = create_access_token(admin_username)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "username": admin_username,
            "role": "shop_admin",
        },
    }


@router.get("/me")
def me(request: Request):
    payload = getattr(request.state, "auth_payload", None)

    if not payload:
        raise HTTPException(status_code=401, detail="Chưa đăng nhập.")

    return {
        "user": {
            "username": payload.get("sub"),
            "role": "shop_admin",
        }
    }
