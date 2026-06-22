import os
import json
import httpx
from dotenv import load_dotenv

load_dotenv(".env")

PAGE_ID = os.getenv("FACEBOOK_PAGE_ID")
TOKEN = os.getenv("FACEBOOK_PAGE_ACCESS_TOKEN")
VERSION = os.getenv("FACEBOOK_GRAPH_VERSION", "v25.0")

if not PAGE_ID:
    raise RuntimeError("Missing FACEBOOK_PAGE_ID")

if not TOKEN:
    raise RuntimeError("Missing FACEBOOK_PAGE_ACCESS_TOKEN")

GRAPH = f"https://graph.facebook.com/{VERSION}"

response = httpx.post(
    f"{GRAPH}/{PAGE_ID}/subscribed_apps",
    data={
        "subscribed_fields": "feed",
        "access_token": TOKEN,
    },
    timeout=30,
)

text = json.dumps(response.json(), ensure_ascii=False, indent=2)
text = text.replace(TOKEN, "***TOKEN_HIDDEN***")

print("POST status:", response.status_code)
print(text)

check = httpx.get(
    f"{GRAPH}/{PAGE_ID}/subscribed_apps",
    params={"access_token": TOKEN},
    timeout=30,
)

check_text = json.dumps(check.json(), ensure_ascii=False, indent=2)
check_text = check_text.replace(TOKEN, "***TOKEN_HIDDEN***")

print("\nGET status:", check.status_code)
print(check_text)
