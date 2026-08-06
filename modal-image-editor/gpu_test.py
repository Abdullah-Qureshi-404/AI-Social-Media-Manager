import requests

url = "https://maq-dev404--social-media-image-editor-gpu-test.modal.run"

response = requests.post(
    url,
    json={}
)

print(response.json())