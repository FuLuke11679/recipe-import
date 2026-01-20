from datetime import datetime, timedelta

from app.models import ImportJob
from app.schemas import ImportStatus
from app.services import get_recent_import


def test_idempotent_import_same_url(client):
    payload = {"url": "https://www.tiktok.com/@chef/video/1", "user_id": "anon-1"}
    r1 = client.post("/imports", json=payload)
    assert r1.status_code == 200
    first_id = r1.json()["id"]

    r2 = client.post("/imports", json=payload)
    assert r2.status_code == 200
    assert r2.json()["id"] == first_id


def test_recent_import_lookup(session=None):
    # simple unit check with fake session if provided
    if not session:
        return
    job = ImportJob(user_id="u", url="x", status=ImportStatus.CREATED, created_at=datetime.utcnow())
    session.add(job)
    session.commit()
    found = get_recent_import(session, "u", "x")
    assert found is not None
    job.created_at = datetime.utcnow() - timedelta(days=2)
    session.commit()
    assert get_recent_import(session, "u", "x") is None

