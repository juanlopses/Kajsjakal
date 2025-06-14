# generate.py
import sys
from diffusers import DiffusionPipeline
import torch

prompt = sys.argv[1]
negative_prompt = sys.argv[2]
seed = int(sys.argv[3])
width = int(sys.argv[4])
height = int(sys.argv[5])
steps = int(sys.argv[6])
guidance = float(sys.argv[7])

pipe = DiffusionPipeline.from_pretrained(
    "Heartsync/NSFW-Uncensored",
    torch_dtype=torch.float16
)
pipe.to("cuda")

generator = torch.Generator("cuda").manual_seed(seed)

image = pipe(
    prompt=prompt,
    negative_prompt=negative_prompt,
    num_inference_steps=steps,
    guidance_scale=guidance,
    width=width,
    height=height,
    generator=generator
).images[0]

# Guardar en /tmp para compatibilidad con Render
image.save("/tmp/generated.png")
