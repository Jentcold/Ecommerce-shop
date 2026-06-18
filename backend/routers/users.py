import os
import httpx
import logging

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from dependencies import get_db, get_current_user
from models.users import User
from schemas.users import UserCreate, UserLogin, UserUpdate, UserResponse, Token
from auth import (hash_password, verify_password, create_access_token,generate_verification_token, is_token_expired)
from utils.email import send_verification_email

load_dotenv()
logger = logging.getLogger(__name__)
router = APIRouter(tags=["Users"])

# ── Google OAuth config ───────────────────────────────────────────────────────

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI")

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"

FRONTEND_URL = os.getenv("FRONTEND_URL")

# ── Register ──────────────────────────────────────────────────────────────────

@router.post("/auth/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    token, expires_at = generate_verification_token()

    user = User(
        username=payload.username,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        verification_token=token,
        verification_token_expires_at=expires_at,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    send_verification_email(user.email, token)
    logger.info(f"New user registered: {user.email}")

    return Token(access_token=create_access_token(user.id))


# ── Verify email ──────────────────────────────────────────────────────────────

@router.get("/auth/verify-email")
def verify_email(token: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.verification_token == token).first()

    if not user:
        raise HTTPException(status_code=400, detail="Invalid verification token")

    if is_token_expired(user.verification_token_expires_at):
        raise HTTPException(status_code=400, detail="Verification token has expired — request a new one")

    user.is_verified = True
    user.verification_token = None
    user.verification_token_expires_at = None
    db.commit()

    return {"message": "Email verified successfully"}


# ── Resend verification ───────────────────────────────────────────────────────

@router.post("/auth/resend-verification")
def resend_verification(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.is_verified:
        raise HTTPException(status_code=400, detail="Email is already verified")

    token, expires_at = generate_verification_token()
    current_user.verification_token = token
    current_user.verification_token_expires_at = expires_at
    db.commit()

    send_verification_email(current_user.email, token)
    return {"message": "Verification email sent"}


# ── Login ─────────────────────────────────────────────────────────────────────

@router.post("/auth/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()

    if not user or not user.hashed_password:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    logger.info(f"User logged in: {user.email}")
    return Token(access_token=create_access_token(user.id))


# ── Google OAuth — Step 1: redirect ──────────────────────────────────────────

@router.get("/auth/google")
def google_login():
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
    }
    query = "&".join(f"{k}={v}" for k, v in params.items())
    return RedirectResponse(f"{GOOGLE_AUTH_URL}?{query}")


# ── Google OAuth — Step 2: callback ──────────────────────────────────────────

@router.get("/auth/google/callback", response_model=Token)
def google_callback(code: str, db: Session = Depends(get_db)):
    with httpx.Client() as client:
        token_resp = client.post(GOOGLE_TOKEN_URL, data={
            "code": code,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        })
        if token_resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to exchange Google token")

        google_access_token = token_resp.json().get("access_token")

        info_resp = client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {google_access_token}"},
        )
        if info_resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to fetch Google user info")

        info = info_resp.json()

    google_id  = info.get("sub")
    email      = info.get("email")
    name       = info.get("name", "").replace(" ", "_").lower()
    avatar_url = info.get("picture")

    user = (
        db.query(User).filter(User.google_id == google_id).first()
        or db.query(User).filter(User.email == email).first()
    )

    if user:
        if not user.google_id:
            user.google_id = google_id
            user.avatar_url = avatar_url
            db.commit()
    else:
        base_username = name or email.split("@")[0]
        username = base_username
        counter = 1
        while db.query(User).filter(User.username == username).first():
            username = f"{base_username}{counter}"
            counter += 1

        user = User(
            username=username,
            email=email,
            google_id=google_id,
            avatar_url=avatar_url,
            is_verified=True,   # Google emails are already verified
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        logger.info(f"New user via Google OAuth: {user.email}")

    token = create_access_token(user.id)
    # Redirect to frontend with token in URL
    return RedirectResponse(f"{FRONTEND_URL}/auth/callback?token={token}")




# ── Verify current password ───────────────────────────────────────────────────

@router.post("/auth/verify-password", status_code=status.HTTP_200_OK)
def verify_current_password(
    payload: UserLogin,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Checks if the provided password and email match the current user's credentials."""
    if payload.email.lower() != current_user.email.lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Email does not match the authenticated user"
        )
    """Checks if the provided password matches the current user's password."""
    if not current_user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Account uses social login — no password set"
        )
        
    if not verify_password(payload.password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Incorrect password"
        )
        
    return {"valid": True}
# ── Get current user ──────────────────────────────────────────────────────────

@router.get("/users/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


# ── Update current user ───────────────────────────────────────────────────────

@router.put("/users/me", response_model=UserResponse)
def update_me(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
     # ── Handle Password Updates ──────────────────────────────────────────────────
    # 1. Normalize the email comparison to avoid false alarms on casing/spaces
    email_changed = (
        payload.email 
        and payload.email.strip().lower() != current_user.email.strip().lower()
    )

    if payload.password or email_changed:
        
        if not payload.current_password:
            raise HTTPException(
                status_code=400, 
                detail="Current password is required to update your email or password."
            )
        
        if not current_user.hashed_password:
            raise HTTPException(
                status_code=400, 
                detail="Account uses social login — no password set"
            )

        if not verify_password(payload.current_password, current_user.hashed_password):
            raise HTTPException(
                status_code=401, 
                detail="Incorrect current password"
            )

    # ── Handle Email Updates ──────────────────────────────────────────────────
    if email_changed:
        email_exists = db.query(User).filter(User.email.ilike(payload.email.strip())).first()
        if email_exists and email_exists.id != current_user.id:
            raise HTTPException(status_code=400, detail="Email already in use")
            
        current_user.email = payload.email.strip()
        current_user.is_verified = False

        token, expires_at = generate_verification_token()
        current_user.verification_token = token
        current_user.verification_token_expires_at = expires_at
        send_verification_email(current_user.email, token)

    # ── Handle Username Updates ───────────────────────────────────────────────
    if payload.username and payload.username != current_user.username:
        if db.query(User).filter(User.username == payload.username).first():
            raise HTTPException(status_code=400, detail="Username already taken")
        current_user.username = payload.username

    # ── Handle Password Updates ───────────────────────────────────────────────
    if payload.password:
        # Check if they are trying to reuse their old password
        if verify_password(payload.password, current_user.hashed_password):
            raise HTTPException(status_code=400, detail="New password must be different")
            
        current_user.hashed_password = hash_password(payload.password)

    db.commit()
    db.refresh(current_user)
    return current_user


# ── Delete own account ────────────────────────────────────────────────────────

@router.delete("/users/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user.is_active = False
    db.commit()
    logger.info(f"User deactivated: {current_user.email}")