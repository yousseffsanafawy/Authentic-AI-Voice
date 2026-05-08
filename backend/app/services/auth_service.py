import uuid
from datetime import datetime, timedelta
from fastapi import HTTPException
from passlib.context import CryptContext
from jose import jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def register(self, email: str, password: str) -> dict:
        result = await self.db.execute(select(User).where(User.email == email))
        if result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Email already registered")

        user = User(
            id=str(uuid.uuid4()),
            email=email,
            hashed_password=pwd_context.hash(password),
        )
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return {"access_token": self._create_token(user.id), "token_type": "bearer"}

    async def login(self, email: str, password: str) -> dict:
        result = await self.db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if not user or not pwd_context.verify(password, user.hashed_password):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        return {"access_token": self._create_token(user.id), "token_type": "bearer"}

    def _create_token(self, user_id: str) -> str:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
        return jwt.encode(
            {"sub": user_id, "exp": expire},
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM,
        )
