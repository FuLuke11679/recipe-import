import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import app


class TestSettings(Settings):
    testing: bool = True


@pytest.fixture(autouse=True)
def override_settings(monkeypatch):
    monkeypatch.setenv("APP_TESTING", "true")
    yield


@pytest.fixture
def client():
    return TestClient(app)

