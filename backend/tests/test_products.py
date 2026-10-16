def test_create_product(client, category):
    response = client.post(
        "/api/products",
        json={"sku": "OFF-1", "name": "Stapler", "category_id": category["id"], "quantity": 5, "reorder_level": 10},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["sku"] == "OFF-1"
    assert body["category_name"] == "Electronics"
    assert body["status"] == "low_stock"


def test_create_product_validates_input(client):
    response = client.post("/api/products", json={"sku": "bad sku!", "name": "", "quantity": -1})
    assert response.status_code == 422


def test_duplicate_sku_is_rejected(client, product):
    response = client.post("/api/products", json={"sku": "ELEC-1", "name": "Another mouse"})
    assert response.status_code == 409


def test_unknown_category_is_rejected(client):
    response = client.post("/api/products", json={"sku": "X-1", "name": "Ghost", "category_id": 999})
    assert response.status_code == 400


def test_get_product_and_404(client, product):
    assert client.get(f"/api/products/{product['id']}").json()["name"] == "Wireless Mouse"
    assert client.get("/api/products/9999").status_code == 404


def test_update_product(client, product):
    response = client.put(f"/api/products/{product['id']}", json={"unit_price": 25.5, "location": "A1-01"})
    assert response.status_code == 200
    assert response.json()["unit_price"] == 25.5
    assert response.json()["location"] == "A1-01"
    assert response.json()["quantity"] == 50  # quantity is not editable through PUT


def test_delete_product(client, product):
    assert client.delete(f"/api/products/{product['id']}").status_code == 204
    assert client.get(f"/api/products/{product['id']}").status_code == 404
    assert client.delete(f"/api/products/{product['id']}").status_code == 404


def test_search_and_filter_products(client, category):
    for sku, name, qty in [("A-1", "Keyboard", 100), ("A-2", "Mouse", 3), ("A-3", "Monitor", 0)]:
        client.post("/api/products", json={"sku": sku, "name": name, "quantity": qty, "reorder_level": 5})

    assert [p["sku"] for p in client.get("/api/products", params={"q": "mo"}).json()] == ["A-3", "A-2"]
    assert [p["sku"] for p in client.get("/api/products", params={"status": "low_stock"}).json()] == ["A-2"]
    assert [p["sku"] for p in client.get("/api/products", params={"status": "out_of_stock"}).json()] == ["A-3"]
    assert [p["sku"] for p in client.get("/api/products", params={"status": "in_stock"}).json()] == ["A-1"]
