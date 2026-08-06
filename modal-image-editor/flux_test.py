import requests

url = "https://maq-dev404--social-media-image-editor-load-flux-test.modal.run"

response = requests.post(
    url,
    json={}
)

print("STATUS CODE:", response.status_code)
print("HEADERS:", response.headers)
print("RAW RESPONSE:")
print(response.text)