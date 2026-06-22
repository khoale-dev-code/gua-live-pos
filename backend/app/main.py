from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.services.auth import AuthError, verify_access_token
from app.routes import live_games, customers, dashboard, auth, products, categories, live_sessions, live_events, orders, facebook_webhooks

app = FastAPI(title="GUA Live POS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://gua-live-pos.vercel.app",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def shop_auth_middleware(request: Request, call_next):
    path = request.url.path

    public_paths = (
        "/",
        "/api/health",
        "/api/auth/login",
    )

    public_prefixes = (
        "/api/webhooks/facebook",
    )

    if request.method == "OPTIONS":
        return await call_next(request)

    if not path.startswith("/api"):
        return await call_next(request)

    if path in public_paths or any(path.startswith(prefix) for prefix in public_prefixes):
        return await call_next(request)

    auth_header = request.headers.get("Authorization", "")

    if not auth_header.startswith("Bearer "):
        return JSONResponse(
            status_code=401,
            content={"detail": "Bạn cần đăng nhập để sử dụng hệ thống."},
        )

    token = auth_header.replace("Bearer ", "", 1).strip()

    try:
        request.state.auth_payload = verify_access_token(token)
    except AuthError:
        return JSONResponse(
            status_code=401,
            content={"detail": "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."},
        )

    return await call_next(request)

app.include_router(live_games.router)
app.include_router(customers.router)
app.include_router(dashboard.router)
app.include_router(auth.router)
app.include_router(products.router)
app.include_router(categories.router)
app.include_router(live_sessions.router)
app.include_router(live_events.router)
app.include_router(orders.router)
app.include_router(facebook_webhooks.router)


@app.get("/")
def root():
    return {
        "message": "GUA Live POS API is running"
    }


@app.get("/api/health")
def health_check():
    return {
        "status": "ok"
    }
