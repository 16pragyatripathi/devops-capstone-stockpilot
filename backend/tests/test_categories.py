def test_create_and_list_categories(client):
    response = client.post("/api/categories", json={"name": "Furniture", "description": "Desks"})
    assert response.status_code == 201
    assert response.json()["name"] == "Furniture"

    listed = client.get("/api/categories").json()
    assert [c["name"] for c in listed] == ["Furniture"]
    assert listed[0]["product_count"] == 0


def test_duplicate_category_is_rejected(client, category):
    response = client.post("/api/categories", json={"name": "electronics"})
    assert response.status_code == 409


def test_category_counts_products(client, product):
    listed = client.get("/api/categories").json()
    assert listed[0]["product_count"] == 1


def test_deleting_category_keeps_products(client, category, product):
    assert client.delete(f"/api/categories/{category['id']}").status_code == 204
    remaining = client.get(f"/api/products/{product['id']}").json()
    assert remaining["category_id"] is None
    assert remaining["category_name"] is None
