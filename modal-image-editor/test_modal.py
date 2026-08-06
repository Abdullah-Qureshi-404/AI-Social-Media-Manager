import requests

url = "https://maq-dev404--social-media-image-editor-test-connectivity.modal.run"

response = requests.post(
    url,
    json={
        "message": "hello from backend"
    }
)

print(response.json())