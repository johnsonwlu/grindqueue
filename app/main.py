# main.py
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.db_demo import Base, engine, Task, get_db

app = FastAPI()

# Create tables at startup
@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

class TaskCreate(BaseModel):
    title: str

@app.post("/tasks/")
async def create_task(task: TaskCreate, db: AsyncSession = Depends(get_db)):
    new_task = Task(title=task.title)
    db.add(new_task)
    await db.commit()
    await db.refresh(new_task)
    return {"id": new_task.id, "title": new_task.title}

@app.get("/tasks/")
async def list_tasks(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Task))
    tasks = result.scalars().all()
    return [tasks]

@app.post("/tasks/{task_id}/complete")
async def complete_task(task_id: int, db: AsyncSession = Depends(get_db)):
    task = await db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    task.done = True
    await db.commit()
    await db.refresh(task)
    return {"id": task.id, "title": task.title, "done": task.done}
