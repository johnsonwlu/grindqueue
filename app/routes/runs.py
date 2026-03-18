from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import User, Plan, Run
from app.schemas import RunCreate, RunOut
from app.auth import get_current_user

router = APIRouter(prefix="/runs", tags=["runs"])


async def _load_run(run: Run, db: AsyncSession) -> Run:
    await db.refresh(run, ["plan"])
    await db.refresh(run.plan, ["sessions"])
    return run


@router.post("/", response_model=RunOut, status_code=201)
async def start_run(data: RunCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Run).where(Run.user_id == user.id, Run.status.in_(["running", "paused"]))
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="A run is already active. Abandon it first.")

    plan = await db.get(Plan, data.plan_id)
    if not plan or plan.user_id != user.id:
        raise HTTPException(status_code=404, detail="Plan not found")

    run = Run(
        user_id=user.id,
        plan_id=data.plan_id,
        current_session_index=0,
        status="running",
        lock_mode=data.lock_mode,
        session_started_at=datetime.utcnow(),
    )
    db.add(run)
    await db.commit()
    await db.refresh(run)
    return await _load_run(run, db)


@router.get("/active", response_model=RunOut)
async def get_active_run(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Run).where(Run.user_id == user.id, Run.status.in_(["running", "paused"]))
    )
    run = result.scalar_one_or_none()
    if not run:
        raise HTTPException(status_code=404, detail="No active run")
    return await _load_run(run, db)


@router.post("/{run_id}/advance", response_model=RunOut)
async def advance_run(run_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    run = await db.get(Run, run_id)
    if not run or run.user_id != user.id:
        raise HTTPException(status_code=404, detail="Run not found")
    await db.refresh(run, ["plan"])
    await db.refresh(run.plan, ["sessions"])

    if run.current_session_index + 1 >= len(run.plan.sessions):
        run.status = "completed"
    else:
        run.current_session_index += 1
        run.session_started_at = datetime.utcnow()
        run.status = "running"

    await db.commit()
    await db.refresh(run)
    return await _load_run(run, db)


@router.post("/{run_id}/pause", response_model=RunOut)
async def pause_run(run_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    run = await db.get(Run, run_id)
    if not run or run.user_id != user.id:
        raise HTTPException(status_code=404, detail="Run not found")
    if run.status != "running":
        raise HTTPException(status_code=400, detail="Run is not active")
    run.status = "paused"
    await db.commit()
    await db.refresh(run)
    return await _load_run(run, db)


@router.post("/{run_id}/resume", response_model=RunOut)
async def resume_run(run_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    run = await db.get(Run, run_id)
    if not run or run.user_id != user.id:
        raise HTTPException(status_code=404, detail="Run not found")
    if run.status != "paused":
        raise HTTPException(status_code=400, detail="Run is not paused")
    run.status = "running"
    run.session_started_at = datetime.utcnow()
    await db.commit()
    await db.refresh(run)
    return await _load_run(run, db)


@router.post("/{run_id}/abandon", status_code=204)
async def abandon_run(run_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    run = await db.get(Run, run_id)
    if not run or run.user_id != user.id:
        raise HTTPException(status_code=404, detail="Run not found")
    run.status = "completed"
    await db.commit()
