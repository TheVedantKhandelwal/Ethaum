import pytest


@pytest.mark.asyncio
async def test_create_product(client, auth_headers, test_user):
    resp = await client.post("/api/products", headers=auth_headers, json={
        "name": "Test Product",
        "tagline": "A test product",
        "category": "DevTools",
        "user_id": str(test_user.id),
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Test Product"
    assert data["slug"] == "test-product"


@pytest.mark.asyncio
async def test_list_products(client):
    resp = await client.get("/api/products")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_get_product_by_slug(client, auth_headers, test_user):
    # Create first
    await client.post("/api/products", headers=auth_headers, json={
        "name": "Slug Product",
        "category": "Analytics",
        "user_id": str(test_user.id),
    })
    resp = await client.get("/api/products/slug-product")
    assert resp.status_code == 200
    assert resp.json()["name"] == "Slug Product"


@pytest.mark.asyncio
async def test_get_product_not_found(client):
    resp = await client.get("/api/products/nonexistent-slug")
    assert resp.status_code == 404
