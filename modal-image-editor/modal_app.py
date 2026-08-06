import modal
import os

os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"


image = modal.Image.debian_slim().pip_install(
    "fastapi[standard]",
    "torch",
    "diffusers",
    "transformers",
    "accelerate",
    "pillow",
    "opencv-python",
    "huggingface_hub",
    "sentencepiece",
    "protobuf",
    "torchvision"
)


app = modal.App(
    "social-media-image-editor",
    image=image
)


@app.cls(
    gpu="A100-40GB",
    secrets=[
        modal.Secret.from_name("huggingface-secret")
    ],
    timeout=1200,
    scaledown_window=300
)
class SDXLControlNetGenerator:


    @modal.enter()
    def load_model(self):

        import torch
        from diffusers import (
            StableDiffusionXLControlNetPipeline,
            ControlNetModel
        )
        from huggingface_hub import login


        token=os.getenv("HF_TOKEN")

        login(token)


        controlnet = ControlNetModel.from_pretrained(
            "diffusers/controlnet-canny-sdxl-1.0",
            torch_dtype=torch.float16,
            token=token
        )


        self.pipe = StableDiffusionXLControlNetPipeline.from_pretrained(
            "stabilityai/stable-diffusion-xl-base-1.0",
            controlnet=controlnet,
            torch_dtype=torch.float16,
            token=token
        )


        self.pipe.enable_model_cpu_offload()

        self.pipe.enable_vae_slicing()
        self.pipe.enable_vae_tiling()


        print("SDXL ControlNet loaded")



    @modal.fastapi_endpoint(method="POST")
    def generate(self,data:dict):

        import torch
        import base64
        import io
        import time
        import gc

        from PIL import Image
        import cv2
        import numpy as np


        try:

            start=time.time()


            gc.collect()
            torch.cuda.empty_cache()


            image_base64=data.get("image_base64")


            if not image_base64:
                return {
                    "status":"failed",
                    "error":"image_base64 missing"
                }


            img_bytes=base64.b64decode(image_base64)


            image=Image.open(
                io.BytesIO(img_bytes)
            ).convert("RGB")


            image.thumbnail(
                (1024,1024)
            )


            #
            # Create Canny edges
            #

            img_np=np.array(image)

            edges=cv2.Canny(
                img_np,
                100,
                200
            )


            edges=np.stack(
                [edges]*3,
                axis=2
            )


            control_image=Image.fromarray(
                edges
            )



            prompt=data.get(
                "prompt",
                """
                Professional luxury cafe food photography.
                Keep the cupcake unchanged.
                Replace background with a premium cafe interior.
                Marble table.
                Coffee cup.
                Warm sunlight.
                DSLR photography.
                High end restaurant advertisement.
                """
            )


            with torch.inference_mode():

                result=self.pipe(
                    prompt=prompt,
                    image=control_image,
                    controlnet_conditioning_scale=0.8,
                    num_inference_steps=30
                )


            output=result.images[0]


            buffer=io.BytesIO()

            output.save(
                buffer,
                format="PNG"
            )


            encoded=base64.b64encode(
                buffer.getvalue()
            ).decode()


            elapsed=time.time()-start


            return {
                "status":"success",
                "image_base64":encoded,
                "time":elapsed
            }


        except Exception as e:

            return {
                "status":"failed",
                "error":str(e)
            }