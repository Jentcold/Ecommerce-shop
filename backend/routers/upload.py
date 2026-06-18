import os
import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from typing import List

from dependencies import get_current_admin
from models.users import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/upload", tags=["Admin — Upload"])

# Where images get saved on disk
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "static", "images")

# Allowed file types
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_SIZE_MB = 5


@router.post("/", response_model=list[str])
async def upload_images(
    files: List[UploadFile] = File(...),
    admin: User = Depends(get_current_admin),
):
    """Upload one or more image files. Returns list of accessible URLs."""
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    urls = []

    for file in files:
        # Validate type
        if file.content_type not in ALLOWED_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"File '{file.filename}' is not an allowed image type. Use JPEG, PNG, WebP, or GIF."
            )

        # Read and validate size
        contents = await file.read()
        size_mb = len(contents) / (1024 * 1024)
        if size_mb > MAX_SIZE_MB:
            raise HTTPException(
                status_code=400,
                detail=f"File '{file.filename}' is too large ({size_mb:.1f}MB). Maximum is {MAX_SIZE_MB}MB."
            )

        # Generate unique filename preserving extension
        ext = os.path.splitext(file.filename)[1].lower() or ".jpg"
        filename = f"{uuid.uuid4().hex}{ext}"
        filepath = os.path.join(UPLOAD_DIR, filename)

        with open(filepath, "wb") as f:
            f.write(contents)

        # Return the URL path — will be served by FastAPI's StaticFiles
        url = f"/static/images/{filename}"
        urls.append(url)
        logger.info(f"Admin {admin.email} uploaded image: {filename}")

    return urls