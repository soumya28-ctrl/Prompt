from backend.main import app as fastapi_app


async def app(scope, receive, send):
    if scope["type"] == "http" and scope["path"].startswith("/api"):
        scope = dict(scope)
        scope["path"] = scope["path"][4:] or "/"
        scope["raw_path"] = scope["raw_path"][4:] or b"/"
    await fastapi_app(scope, receive, send)
