import pytest
from app.services.password_reset_service import create_password_reset_token, get_user_id_for_reset_token


@pytest.mark.asyncio
async def test_forgot_password_existing_email(client, test_user):
    payload = {"email": "testowner@bakery.com"}
    response = await client.post("/api/v1/auth/forgot-password", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "If an account exists for that email" in data["message"]


@pytest.mark.asyncio
async def test_forgot_password_non_existing_email(client):
    payload = {"email": "nonexistent@bakery.com"}
    response = await client.post("/api/v1/auth/forgot-password", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "If an account exists for that email" in data["message"]


@pytest.mark.asyncio
async def test_forgot_password_invalid_email(client):
    payload = {"email": "invalid-email-format"}
    response = await client.post("/api/v1/auth/forgot-password", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_reset_password_success_and_login_flow(client, test_user):
    # 1. Create valid token directly using service
    raw_token = create_password_reset_token(test_user.id)
    assert raw_token is not None

    # 2. Reset password using valid token
    new_password = "BrandNewPassword123!"
    reset_payload = {
        "token": raw_token,
        "new_password": new_password,
    }
    response = await client.post("/api/v1/auth/reset-password", json=reset_payload)
    assert response.status_code == 200
    assert response.json()["message"] == "Password reset successfully."

    # 3. Verify old password fails
    old_login_payload = {
        "email": "testowner@bakery.com",
        "password": "secret123",
    }
    old_login_resp = await client.post("/api/v1/auth/login", json=old_login_payload)
    assert old_login_resp.status_code == 401

    # 4. Verify new password succeeds
    new_login_payload = {
        "email": "testowner@bakery.com",
        "password": new_password,
    }
    new_login_resp = await client.post("/api/v1/auth/login", json=new_login_payload)
    assert new_login_resp.status_code == 200
    assert "access_token" in new_login_resp.json()


@pytest.mark.asyncio
async def test_reset_password_reused_token_fails(client, test_user):
    raw_token = create_password_reset_token(test_user.id)

    # First reset succeeds
    reset_payload = {
        "token": raw_token,
        "new_password": "NewPassword123!",
    }
    resp1 = await client.post("/api/v1/auth/reset-password", json=reset_payload)
    assert resp1.status_code == 200

    # Second reset with SAME token fails (single-use enforcement)
    resp2 = await client.post("/api/v1/auth/reset-password", json=reset_payload)
    assert resp2.status_code == 400
    assert resp2.json()["error"]["code"] == "INVALID_RESET_TOKEN"


@pytest.mark.asyncio
async def test_reset_password_invalid_token_fails(client):
    reset_payload = {
        "token": "invalid_fake_token_string",
        "new_password": "NewPassword123!",
    }
    response = await client.post("/api/v1/auth/reset-password", json=reset_payload)
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_RESET_TOKEN"


@pytest.mark.asyncio
async def test_reset_password_weak_password_fails(client, test_user):
    raw_token = create_password_reset_token(test_user.id)
    reset_payload = {
        "token": raw_token,
        "new_password": "short",
    }
    response = await client.post("/api/v1/auth/reset-password", json=reset_payload)
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "WEAK_PASSWORD"
