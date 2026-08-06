import requests
import base64


URL = " https://maq-dev404--social-media-image-editor-sdxlcontrolnetgene-364009.modal.run"

# Read image
with open("test.png", "rb") as f:
    image_bytes = f.read()


image_base64 = base64.b64encode(
    image_bytes
).decode("utf-8")


payload = {
    "image_base64": image_base64,
    "prompt": """
Transform this cupcake photo into a premium Instagram cafe advertisement.

Keep the exact same cupcake shape, toppings, frosting, and ingredients.

Only change:
- background
- table surface
- lighting
- atmosphere
- camera quality

Add:
warm cafe lighting,
wooden cafe table,
soft bokeh background,
professional food photography,
high-end restaurant style.
""",
    "strength": 0.45
}


response = requests.post(
    URL,
    json=payload,
    timeout=300
)


print("STATUS:", response.status_code)

data = response.json()

print(data.keys())


if "image_base64" in data:

    output = base64.b64decode(
        data["image_base64"]
    )

    with open(
        "edited_output.png",
        "wb"
    ) as f:
        f.write(output)


    print("Saved: edited_output.png")

else:

    print(data)