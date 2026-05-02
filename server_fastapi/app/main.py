from fastapi import FastAPI
from contextlib import asynccontextmanager

from app.database import create_tables
from app.routers.auth import router as auth_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await create_tables()
    except Exception:
        pass
    yield


app = FastAPI(
    title="Social World API",
    description="A social virtual world game backend",
    version="1.0.0",
    lifespan=lifespan
)


app.include_router(auth_router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
