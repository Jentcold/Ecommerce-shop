from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    username = Column(String, nullable=False, unique=True, index=True)
    email = Column(String, nullable=False, unique=True, index=True)

    # Nullable because Google OAuth users have no password
    hashed_password = Column(String, nullable=True)

    # Google OAuth fields
    google_id = Column(String, nullable=True, unique=True, index=True)
    avatar_url = Column(String, nullable=True)

    created_at = Column(DateTime, server_default=func.now())

    is_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)

    # Email verification
    verification_token = Column(String, nullable=True, index=True)
    verification_token_expires_at = Column(DateTime, nullable=True)

