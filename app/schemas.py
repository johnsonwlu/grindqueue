from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# --- Auth ---

class UserCreate(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    created_at: datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str


# --- Sessions ---

class SessionCreate(BaseModel):
    url: str
    label: Optional[str] = None
    duration_minutes: int
    order: int = 0


class SessionUpdate(BaseModel):
    url: Optional[str] = None
    label: Optional[str] = None
    duration_minutes: Optional[int] = None
    order: Optional[int] = None


class SessionOut(BaseModel):
    id: int
    url: str
    label: Optional[str]
    duration_minutes: int
    order: int

    model_config = {"from_attributes": True}


# --- Plans ---

class PlanCreate(BaseModel):
    name: str
    description: Optional[str] = None
    sessions: Optional[List[SessionCreate]] = []


class PlanUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class PlanOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    created_at: datetime
    sessions: List[SessionOut] = []

    model_config = {"from_attributes": True}


class SessionReorder(BaseModel):
    session_ids: List[int]


# --- Runs ---

class RunCreate(BaseModel):
    plan_id: int
    lock_mode: bool = False


class RunOut(BaseModel):
    id: int
    plan_id: int
    current_session_index: int
    status: str
    lock_mode: bool
    session_started_at: Optional[datetime]
    started_at: datetime
    plan: PlanOut

    model_config = {"from_attributes": True}
