from sqlalchemy import Column, Integer, String, Boolean
from database import Base


class SiteSetting(Base):
    __tablename__ = "site_settings"

    id    = Column(Integer, primary_key=True)
    key   = Column(String, unique=True, nullable=False, index=True)
    value = Column(String, nullable=False)


# Default settings seeded on startup:
# sale_active = "false"