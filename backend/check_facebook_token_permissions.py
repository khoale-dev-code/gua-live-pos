import os
import json
import httpx
from dotenv import load_dotenv

load_dotenv(".env")

TOKEN = os.getenv("FACEBOOK_PAGE_ACCESS_TOKEN")
PAGE_ID = os.getenv("FACEBOOK_PAGE_ID")
VERSION = os.getenv("FACEBOOK_GRAPH_VERSION", "v25.0")

if not TOKEN:
    raise RuntimeError("Missing FACEBOOK_PAGE_ACCESS_TOKEN")

GRAPH = f"https://graph.facebook.com/{VERSION}"


def safe_print(data):
    text = json.dumps(data, ensure_ascii=False, indent=2)
    text = text.replace(TOKEN, "***TOKEN_HIDDEN***")
    print(text)


print("Kiểm tra token debug...")
r = httpx.get(
    f"{GRAPH}/debug_token",
    params={
        "input_token": TOKEN,
        "access_token": TOKEN,
    },
    timeout=30,
)

print("debug_token status:", r.status_code)
safe_print(r.json())

print("\nKiểm tra Page fields...")
r2 = httpx.get(
    f"{GRAPH}/{PAGE_ID}",
    params={
        "fields": "id,name,access_token,tasks",
        "access_token": TOKEN,
    },
    timeout=30,
)

print("page status:", r2.status_code)
safe_print(r2.json())
