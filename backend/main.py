from fastapi import FastAPI, Depends
from contextlib import asynccontextmanager
from sqlmodel import Session, select, SQLModel
from typing import List
from pydantic import computed_field
from fastapi.middleware.cors import CORSMiddleware
from database import get_session, engine
from models import *
from routers import users, content, stage

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    print("Base de datos iniciada correctamente y tablas verificadas")
    yield

app = FastAPI(
    title="Quizzie API",
    description="Aplicación para gestión de Quizzes en tiempo real",
    lifespan=lifespan
)

origins = [
    "http://localhost:5173", 
    "http://127.0.0.1:5173",
    "https://quizzie-tfg.onrender.com",
    "https://quizzie-tfg.vercel.app"
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


