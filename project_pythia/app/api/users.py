import logging
from fastapi import APIRouter, Depends
from project_pythia.app.core.security import get_user
from project_pythia.app.models.user import User
from project_pythia.app.schemas.user import UserMeResponse

router = APIRouter(prefix="/users", tags=["Users"])
logger = logging.getLogger(__name__)

@router.get("/me", response_model=UserMeResponse)
async def get_me(user: User = Depends(get_user)):
    return user
