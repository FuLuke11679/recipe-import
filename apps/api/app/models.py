import uuid
from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy import JSON, Column, DateTime, Enum, String, Text
from sqlalchemy.dialects.postgresql import UUID

from .db import Base
from .schemas import ImportStatus


class ImportJob(Base):
    __tablename__ = "import_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, nullable=False, index=True)
    url = Column(String, nullable=False, index=True)
    status = Column(Enum(ImportStatus), default=ImportStatus.CREATED, nullable=False)
    import_metadata = Column(JSON, nullable=True)
    raw_recipe_text = Column(Text, nullable=True)
    parsed_recipe = Column(JSON, nullable=True)
    adapted_recipe = Column(JSON, nullable=True)
    change_summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": str(self.id),
            "user_id": self.user_id,
            "url": self.url,
            "status": self.status.value,
            "metadata": self.import_metadata,
            "raw_recipe_text": self.raw_recipe_text,
            "parsed_recipe": self.parsed_recipe,
            "adapted_recipe": self.adapted_recipe,
            "change_summary": self.change_summary,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }

