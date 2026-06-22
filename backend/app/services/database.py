from __future__ import annotations

import os
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

import psycopg
from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parents[2]
ENV_PATH = BASE_DIR / ".env"

# override=True để luôn lấy giá trị mới nhất trong backend/.env
# tránh bị dính DATABASE_URL cũ từ terminal/system environment.
load_dotenv(dotenv_path=ENV_PATH, override=True)


def _clean_env(value: str | None) -> str:
    return (value or "").strip().strip('"').strip("'")


DATABASE_URL = _clean_env(os.getenv("DATABASE_URL"))
DB_CONNECT_TIMEOUT = int(_clean_env(os.getenv("DB_CONNECT_TIMEOUT")) or "30")


class DatabaseConfigError(RuntimeError):
    pass


class DatabaseConnectionError(RuntimeError):
    pass


def _parsed_database_url():
    if not DATABASE_URL:
        raise DatabaseConfigError(
            f"Missing DATABASE_URL. Checked env file at: {ENV_PATH}"
        )

    parsed = urlparse(DATABASE_URL)

    if not parsed.scheme.startswith("postgres"):
        raise DatabaseConfigError(
            "DATABASE_URL không đúng định dạng PostgreSQL. "
            "Ví dụ: postgresql://user:password@host:6543/postgres?sslmode=require"
        )

    if not parsed.hostname:
        raise DatabaseConfigError("DATABASE_URL thiếu host.")

    if not parsed.username:
        raise DatabaseConfigError("DATABASE_URL thiếu username.")

    if not parsed.password:
        raise DatabaseConfigError(
            "DATABASE_URL thiếu database password. "
            "Không dùng anon key, publishable key, service_role key cho DATABASE_URL."
        )

    return parsed


def _ensure_sslmode_require(url: str) -> str:
    parsed = urlparse(url)
    query_items = dict(parse_qsl(parsed.query, keep_blank_values=True))

    if "supabase" in (parsed.hostname or "") and "sslmode" not in query_items:
        query_items["sslmode"] = "require"

    return urlunparse(
        parsed._replace(query=urlencode(query_items))
    )


def is_transaction_pooler_url(url: str | None = None) -> bool:
    parsed = urlparse(url or DATABASE_URL)
    return (
        "pooler.supabase.com" in (parsed.hostname or "")
        and str(parsed.port or "") == "6543"
    )


def mask_database_url(url: str | None = None) -> str:
    url = url or DATABASE_URL

    if not url:
        return "DATABASE_URL is empty"

    try:
        parsed = urlparse(url)
        scheme = parsed.scheme or "postgresql"
        username = parsed.username or "unknown-user"
        hostname = parsed.hostname or "unknown-host"
        port = f":{parsed.port}" if parsed.port else ""
        path = parsed.path or ""
        query = f"?{parsed.query}" if parsed.query else ""

        return f"{scheme}://{username}:***@{hostname}{port}{path}{query}"
    except Exception:
        return "Invalid DATABASE_URL"


def validate_database_url() -> None:
    parsed = _parsed_database_url()
    host = parsed.hostname or ""
    username = parsed.username or ""

    if "real-region" in DATABASE_URL.lower():
        raise DatabaseConfigError(
            "DATABASE_URL vẫn còn placeholder REAL-REGION. "
            "Hãy sửa host thật, ví dụ: aws-0-ap-south-1.pooler.supabase.com"
        )

    if "<" in DATABASE_URL or ">" in DATABASE_URL:
        raise DatabaseConfigError(
            "DATABASE_URL vẫn còn placeholder dạng <...>. "
            "Hãy thay bằng giá trị thật trong Supabase Dashboard."
        )

    if "pooler.supabase.com" in host:
        if "." not in username:
            raise DatabaseConfigError(
                "Pooler Supabase cần username dạng postgres.<project-ref>. "
                f"Username hiện tại: {username}"
            )

        if parsed.port not in (5432, 6543):
            raise DatabaseConfigError(
                "Supabase Pooler thường dùng port 5432 cho Session Pooler "
                "hoặc 6543 cho Transaction Pooler."
            )

    if host.startswith("db.") and host.endswith(".supabase.co"):
        print(
            "[DB WARNING] Bạn đang dùng Direct Connection. "
            "Nếu máy/mạng không hỗ trợ IPv6, hãy dùng Supabase Pooler."
        )


def debug_database_config() -> dict:
    parsed = _parsed_database_url()

    username = parsed.username or ""
    project_ref_from_username = None

    if "." in username:
        project_ref_from_username = username.split(".", 1)[1]

    return {
        "env_path": str(ENV_PATH),
        "database_url_masked": mask_database_url(),
        "host": parsed.hostname,
        "port": parsed.port,
        "database": parsed.path.replace("/", "") or None,
        "username": username,
        "project_ref_from_username": project_ref_from_username,
        "is_supabase_pooler": "pooler.supabase.com" in (parsed.hostname or ""),
        "is_transaction_pooler": is_transaction_pooler_url(),
        "connect_timeout": DB_CONNECT_TIMEOUT,
    }


def get_connection():
    validate_database_url()

    safe_url = _ensure_sslmode_require(DATABASE_URL)

    try:
        # Supabase Transaction Pooler port 6543 không hỗ trợ prepared statements,
        # nên tắt prepare_threshold khi dùng 6543.
        if is_transaction_pooler_url(safe_url):
            return psycopg.connect(
                safe_url,
                connect_timeout=DB_CONNECT_TIMEOUT,
                prepare_threshold=None,
            )

        return psycopg.connect(
            safe_url,
            connect_timeout=DB_CONNECT_TIMEOUT,
        )

    except psycopg.OperationalError as error:
        error_text = str(error)

        hint = (
            "Không kết nối được Supabase Postgres.\n"
            f"ENV_PATH: {ENV_PATH}\n"
            f"DATABASE_URL đang dùng: {mask_database_url(safe_url)}\n\n"
        )

        if "tenant/user" in error_text and "not found" in error_text:
            hint += (
                "Khả năng cao: pooler host hoặc project-ref trong username chưa đúng "
                "với project Supabase thật.\n"
                "Cách sửa: Supabase Dashboard > Connect > Transaction Pooler, "
                "copy nguyên connection string, không tự ghép host/region.\n\n"
            )
        elif "failed to resolve host" in error_text:
            hint += (
                "Khả năng cao: host trong DATABASE_URL sai hoặc vẫn còn placeholder.\n"
                "Kiểm tra không còn REAL-REGION, <POOLER_HOST_FROM_DASHBOARD>, "
                "hoặc host gõ sai.\n\n"
            )
        elif "password authentication failed" in error_text:
            hint += (
                "Khả năng cao: database password sai. "
                "DATABASE_URL phải dùng Database Password, không phải Supabase API key.\n\n"
            )
        else:
            hint += (
                "Hãy kiểm tra DATABASE_URL, network, Supabase project status "
                "và copy lại connection string từ Dashboard.\n\n"
            )

        raise DatabaseConnectionError(hint + f"Lỗi gốc: {error_text}") from error


def test_connection() -> dict:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("select now(), current_database(), current_user")
            row = cur.fetchone()

    return {
        "ok": True,
        "database_time": row[0].isoformat() if row and row[0] else None,
        "database": row[1] if row else None,
        "user": row[2] if row else None,
        "config": debug_database_config(),
    }