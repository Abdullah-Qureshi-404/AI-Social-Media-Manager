import requests

url = "https://maq-dev404--social-media-image-editor-secret-test.modal.run"

response = requests.post(
    url,
    json={}
)

print(response.json())