import os
import time
from typing import Any

from dotenv import load_dotenv
from TikTokLive import TikTokLiveClient
from TikTokLive.events import CommentEvent, ConnectEvent, DisconnectEvent

from app.services.live_comment_service import (
    insert_live_comment,
    mark_session_connected,
    mark_session_ended,
    mark_session_error,
)

load_dotenv()

TIKTOK_USERNAME = os.getenv("TIKTOK_USERNAME", "")


def normalize_tiktok_username(username: str):
    username = (username or "").strip()

    if not username:
        username = TIKTOK_USERNAME

    username = username.strip().replace("@", "")

    if not username:
        return ""

    return f"@{username}"


def get_nested_value(value: Any, key: str):
    if value is None:
        return None

    if isinstance(value, dict):
        return value.get(key)

    return getattr(value, key, None)


def pick_first_url(value: Any):
    if not value:
        return None

    if isinstance(value, str):
        clean = value.strip()

        if clean.startswith("http://") or clean.startswith("https://"):
            return clean

        return None

    if isinstance(value, (list, tuple, set)):
        for item in value:
            found = pick_first_url(item)

            if found:
                return found

        return None

    for key in [
        "url_list",
        "urls",
        "url",
        "uri",
        "display_url",
        "avatar_url",
        "avatar_thumb",
        "avatar_medium",
        "avatar_larger",
    ]:
        found = pick_first_url(get_nested_value(value, key))

        if found:
            return found

    if hasattr(value, "__dict__"):
        for item in vars(value).values():
            found = pick_first_url(item)

            if found:
                return found

    return None


def extract_tiktok_avatar(user: Any):
    if not user:
        return None

    candidates = [
        "avatar_thumb",
        "avatar_medium",
        "avatar_larger",
        "avatar_url",
        "profile_picture",
        "profile_picture_url",
    ]

    for field in candidates:
        found = pick_first_url(getattr(user, field, None))

        if found:
            return found

    return pick_first_url(user)


def safe_user_raw(user: Any):
    if not user:
        return {}

    result = {}

    for field in [
        "unique_id",
        "nickname",
        "sec_uid",
        "user_id",
        "id",
        "avatar_thumb",
        "avatar_medium",
        "avatar_larger",
    ]:
        value = getattr(user, field, None)

        if value is None:
            continue

        if field.startswith("avatar"):
            result[field] = pick_first_url(value) or str(value)
        else:
            result[field] = str(value)

    return result


async def run_tiktok_comment_listener(session_id: str, username: str | None = None):
    unique_id = normalize_tiktok_username(username)

    if not unique_id:
        mark_session_error(session_id, "Missing TikTok username")
        return

    client = TikTokLiveClient(unique_id=unique_id)

    @client.on(ConnectEvent)
    async def on_connect(event: ConnectEvent):
        mark_session_connected(session_id)

    @client.on(CommentEvent)
    async def on_comment(event: CommentEvent):
        user = getattr(event, "user", None)

        nickname = getattr(user, "nickname", None) if user else None
        unique_id_user = getattr(user, "unique_id", None) if user else None
        avatar_url = extract_tiktok_avatar(user)

        external_comment_id = (
            str(getattr(event, "id", "") or "")
            or str(getattr(event, "msg_id", "") or "")
            or f"tiktok-{unique_id_user}-{time.time_ns()}"
        )

        insert_live_comment(
            session_id=session_id,
            platform="tiktok",
            external_comment_id=external_comment_id,
            customer_name=nickname or unique_id_user or "Khách TikTok",
            customer_avatar=avatar_url,
            customer_platform_id=str(unique_id_user) if unique_id_user else None,
            message=getattr(event, "comment", "") or "",
            raw_data={
                "source": "tiktok_live",
                "live_username": unique_id,
                "customer_name": nickname,
                "customer_unique_id": unique_id_user,
                "customer_avatar": avatar_url,
                "comment": getattr(event, "comment", ""),
                "user": safe_user_raw(user),
            },
        )

    @client.on(DisconnectEvent)
    async def on_disconnect(event: DisconnectEvent):
        mark_session_ended(session_id)

    try:
        await client.start()
    except Exception as error:
        mark_session_error(session_id, str(error))
