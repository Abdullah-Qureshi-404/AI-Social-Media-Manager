import pytest


@pytest.mark.asyncio
async def test_list_posts_empty(client, auth_headers):
    response = await client.get("/api/v1/posts", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 0


@pytest.mark.asyncio
async def test_unauthorized_post_access(client):
    response = await client.get("/api/v1/posts")
    assert response.status_code == 401
    data = response.json()
    assert data["error"]["code"] == "UNAUTHORIZED"
