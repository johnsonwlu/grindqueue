from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    plans = relationship("Plan", back_populates="user", cascade="all, delete-orphan")
    runs = relationship("Run", back_populates="user", cascade="all, delete-orphan")


class Plan(Base):
    __tablename__ = "plans"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="plans")
    sessions = relationship(
        "Session",
        back_populates="plan",
        cascade="all, delete-orphan",
        order_by="Session.order",
    )
    runs = relationship("Run", back_populates="plan")


class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True)
    plan_id = Column(Integer, ForeignKey("plans.id"), nullable=False)
    url = Column(String, nullable=False)
    label = Column(String, nullable=True)
    duration_minutes = Column(Integer, nullable=False)
    order = Column(Integer, nullable=False, default=0)

    plan = relationship("Plan", back_populates="sessions")


class Run(Base):
    __tablename__ = "runs"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    plan_id = Column(Integer, ForeignKey("plans.id"), nullable=False)
    current_session_index = Column(Integer, nullable=False, default=0)
    # status: running | paused | completed
    status = Column(String, nullable=False, default="running")
    lock_mode = Column(Boolean, nullable=False, default=False)
    session_started_at = Column(DateTime, nullable=True)
    started_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="runs")
    plan = relationship("Plan", back_populates="runs")
