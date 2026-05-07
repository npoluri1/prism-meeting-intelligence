from __future__ import annotations

import logging
import os

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import auth, meetings
from routers.calendar import router as calendar_router
from routers.domains import router as domains_router
from routers.organizations import (
    action_items_router,
    analytics_router,
    router as organizations_router,
    templates_router,
)
from routers.chat import router as chat_router
from routers.webhooks import router as webhooks_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)

app = FastAPI(title="Prism API", version="4.0.0", docs_url="/docs")

_origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(meetings.router)
app.include_router(organizations_router)
app.include_router(templates_router)
app.include_router(action_items_router)
app.include_router(analytics_router)
app.include_router(calendar_router)
app.include_router(domains_router)
app.include_router(webhooks_router)
app.include_router(chat_router)


@app.get("/", tags=["health"])
async def health_check() -> dict:
    return {"status": "ok", "version": "4.0.0", "product": "Prism"}
