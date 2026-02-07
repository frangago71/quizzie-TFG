from contextlib import asynccontextmanager
from fastapi import FastAPI
from database import create_db_and_tables

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    print("Base de datos iniciada correctamente")
    yield

app = FastAPI(lifespan=lifespan)

@app.get("/")
def read_root():
    return {"¡Hola desde FastAPI + SQLModel!"}