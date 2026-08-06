import pytest


@pytest.mark.asyncio
async def test_user_signup_success(client):
    payload = {
        "email": "newowner@cafe.com",
        "password": "StrongPassword123!",
        "full_name": "New Owner",
        "business_name": "Artisanal Coffee",
        "brand_voice": "friendly",
    }
    response = await client.post("/api/v1/auth/signup", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "newowner@cafe.com"
    assert "id" in data


@pytest.mark.asyncio
async def test_user_login_success(client, test_user):
    payload = {
        "email": "testowner@bakery.com",
        "password": "secret123",
    }
    response = await client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_user_login_invalid_password(client, test_user):
    payload = {
        "email": "testowner@bakery.com",
        "password": "wrongpassword",
    }
    response = await client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 401
    data = response.json()
    assert data["error"]["code"] == "UNAUTHORIZED"
