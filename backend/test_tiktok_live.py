import sys
from TikTokLive import TikTokLiveClient
from TikTokLive.events import ConnectEvent, CommentEvent, DisconnectEvent

username = sys.argv[1] if len(sys.argv) > 1 else "vuonlanthanhnha"
username = username.replace("@", "").strip()

client = TikTokLiveClient(unique_id=f"@{username}")


@client.on(ConnectEvent)
async def on_connect(event: ConnectEvent):
    print("✅ Đã kết nối TikTok Live")
    print("Room ID:", getattr(event, "room_id", None))


@client.on(CommentEvent)
async def on_comment(event: CommentEvent):
    nickname = getattr(event.user, "nickname", "Khách TikTok")
    unique_id = getattr(event.user, "unique_id", "")
    comment = getattr(event, "comment", "")

    print(f"💬 {nickname} @{unique_id}: {comment}")


@client.on(DisconnectEvent)
async def on_disconnect(event: DisconnectEvent):
    print("❌ Đã ngắt kết nối TikTok Live")


if __name__ == "__main__":
    print(f"Đang kết nối TikTok Live: @{username}")
    print("Lưu ý: tài khoản phải đang LIVE public.")
    client.run()