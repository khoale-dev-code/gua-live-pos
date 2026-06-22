import os
import json
import httpx
from dotenv import load_dotenv

load_dotenv(".env")

PAGE_ID = os.getenv("FACEBOOK_PAGE_ID", "101971388081997")
TOKEN = os.getenv("FACEBOOK_PAGE_ACCESS_TOKEN")
VERSION = os.getenv("FACEBOOK_GRAPH_VERSION", "v25.0")

if not TOKEN:
    raise SystemExit("Thiếu FACEBOOK_PAGE_ACCESS_TOKEN trong .env")

url = f"https://graph.facebook.com/{VERSION}/{PAGE_ID}/subscribed_apps"

res = httpx.post(
    url,
    data={
        "subscribed_fields": "feed",
        "access_token": TOKEN,
    },
    timeout=30,
)

print("POST status:", res.status_code)
print(json.dumps(res.json(), ensure_ascii=False, indent=2))

res2 = httpx.get(
    url,
    params={"access_token": TOKEN},
    timeout=30,
)

print("GET status:", res2.status_code)
print(json.dumps(res2.json(), ensure_ascii=False, indent=2))
