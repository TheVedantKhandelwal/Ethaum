import pytest


@pytest.mark.asyncio
async def test_register(client):
    resp = await client.post("/api/auth/register", json={
        "email": "newuser@example.com",
        "password": "securepass",
        "name": "New User",
        "role": "buyer",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "newuser@example.com"
    assert data["role"] == "buyer"


@pytest.mark.asyncio
async def test_register_duplicate_email(client):
    payload = {
        "email": "dup@example.com",
        "password": "pass123",
        "name": "Dup User",
        "role": "buyer",
    }
    resp1 = await client.post("/api/auth/register", json=payload)
    assert resp1.status_code == 200

    resp2 = await client.post("/api/auth/register", json=payload)
    assert resp2.status_code == 409


@pytest.mark.asyncio
async def test_login(client):
    # Register first
    await client.post("/api/auth/register", json={
        "email": "login@example.com",
        "password": "mypassword",
        "name": "Login User",
    })
    # Login
    resp = await client.post("/api/auth/login", json={
        "email": "login@example.com",
        "password": "mypassword",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    await client.post("/api/auth/register", json={
        "email": "wrong@example.com",
        "password": "correct",
        "name": "Wrong",
    })
    resp = await client.post("/api/auth/login", json={
        "email": "wrong@example.com",
        "password": "incorrect",
    })
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_get_me(client, auth_headers):
    resp = await client.get("/api/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == "Test User"


@pytest.mark.asyncio
async def test_update_me(client, auth_headers):
    resp = await client.put("/api/auth/me", headers=auth_headers, json={
        "name": "Updated Name",
        "company": "TestCo",
    })
    assert resp.status_code == 200
    assert resp.json()["name"] == "Updated Name"
    assert resp.json()["company"] == "TestCo"


@pytest.mark.asyncio
async def test_unauthorized_access(client):
    resp = await client.get("/api/auth/me")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_refresh_token(client):
    await client.post("/api/auth/register", json={
        "email": "refresh@example.com",
        "password": "pass123",
        "name": "Refresh User",
    })
    login_resp = await client.post("/api/auth/login", json={
        "email": "refresh@example.com",
        "password": "pass123",
    })
    refresh_token = login_resp.json()["refresh_token"]

    resp = await client.post("/api/auth/refresh", json={
        "refresh_token": refresh_token,
    })
    assert resp.status_code == 200
    assert "access_token" in resp.json()
