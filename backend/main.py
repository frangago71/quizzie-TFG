import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel

from database import engine
from routers import content, stage, users


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    print("Base de datos iniciada correctamente y tablas verificadas")
    asyncio.create_task(stage.timer_sync_loop())
    yield


app = FastAPI(
    title="Quizzie API",
    description="Aplicación para gestión de Quizzes en tiempo real",
    lifespan=lifespan,
)

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://quizzie-tfg.onrender.com",
    "https://quizzie-tfg.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["Home"])
def read_root():
    return {"message": "¡Hola desde FastAPI + SQLModel!"}


app.include_router(content.router)
app.include_router(stage.router)
app.include_router(users.router)
