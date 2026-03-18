from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import User, Plan, Session
from app.schemas import (
    PlanCreate, PlanUpdate, PlanOut,
    SessionCreate, SessionUpdate, SessionOut,
    SessionReorder,
)
from app.auth import get_current_user

router = APIRouter(prefix="/plans", tags=["plans"])


async def _get_plan_or_404(plan_id: int, user: User, db: AsyncSession) -> Plan:
    plan = await db.get(Plan, plan_id)
    if not plan or plan.user_id != user.id:
        raise HTTPException(status_code=404, detail="Plan not found")
    await db.refresh(plan, ["sessions"])
    return plan


@router.get("/", response_model=List[PlanOut])
async def list_plans(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(Plan).where(Plan.user_id == user.id))
    plans = result.scalars().all()
    for plan in plans:
        await db.refresh(plan, ["sessions"])
    return plans


@router.post("/", response_model=PlanOut, status_code=201)
async def create_plan(data: PlanCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    plan = Plan(user_id=user.id, name=data.name, description=data.description)
    db.add(plan)
    await db.flush()
    for i, s in enumerate(data.sessions or []):
        db.add(Session(
            plan_id=plan.id,
            url=s.url,
            label=s.label,
            duration_minutes=s.duration_minutes,
            order=s.order if s.order else i,
        ))
    await db.commit()
    await db.refresh(plan, ["sessions"])
    return plan


@router.get("/{plan_id}", response_model=PlanOut)
async def get_plan(plan_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return await _get_plan_or_404(plan_id, user, db)


@router.put("/{plan_id}", response_model=PlanOut)
async def update_plan(plan_id: int, data: PlanUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    plan = await _get_plan_or_404(plan_id, user, db)
    if data.name is not None:
        plan.name = data.name
    if data.description is not None:
        plan.description = data.description
    await db.commit()
    await db.refresh(plan, ["sessions"])
    return plan


@router.delete("/{plan_id}", status_code=204)
async def delete_plan(plan_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    plan = await _get_plan_or_404(plan_id, user, db)
    await db.delete(plan)
    await db.commit()


@router.post("/{plan_id}/sessions", response_model=SessionOut, status_code=201)
async def add_session(plan_id: int, data: SessionCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await _get_plan_or_404(plan_id, user, db)
    session = Session(plan_id=plan_id, url=data.url, label=data.label, duration_minutes=data.duration_minutes, order=data.order)
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


@router.put("/{plan_id}/sessions/{session_id}", response_model=SessionOut)
async def update_session(plan_id: int, session_id: int, data: SessionUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await _get_plan_or_404(plan_id, user, db)
    session = await db.get(Session, session_id)
    if not session or session.plan_id != plan_id:
        raise HTTPException(status_code=404, detail="Session not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(session, field, value)
    await db.commit()
    await db.refresh(session)
    return session


@router.delete("/{plan_id}/sessions/{session_id}", status_code=204)
async def delete_session(plan_id: int, session_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await _get_plan_or_404(plan_id, user, db)
    session = await db.get(Session, session_id)
    if not session or session.plan_id != plan_id:
        raise HTTPException(status_code=404, detail="Session not found")
    await db.delete(session)
    await db.commit()


@router.put("/{plan_id}/sessions/reorder", response_model=PlanOut)
async def reorder_sessions(plan_id: int, data: SessionReorder, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await _get_plan_or_404(plan_id, user, db)
    for i, session_id in enumerate(data.session_ids):
        session = await db.get(Session, session_id)
        if session and session.plan_id == plan_id:
            session.order = i
    await db.commit()
    plan = await db.get(Plan, plan_id)
    await db.refresh(plan, ["sessions"])
    return plan
