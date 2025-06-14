from flask import Flask, request, jsonify
from diffusers import DiffusionPipeline
import torch
import io
import os
import requests
from PIL import Image

app = Flask(__name__)

# Cargar el modelo al inicio
pipe = DiffusionPipeline.from_pretrained(
    "Heartsync/NSFW-Uncensored",
    torch_dtype=torch.float16
)
pipe.to("cuda")

@app.route('/generate', methods=['GET'])
def generate_image():
    prompt = request.args.get('prompt', '')
    negative_prompt = request.args.get('negative_prompt', '')
    seed = int(request.args.get('seed', 42))
    width = int(request.args.get('width', 768))
    height = int(request.args.get('height', 768))
    num_inference_steps = int(request.args.get('num_inference_steps', 30))
    guidance_scale = float(request.args.get('guidance_scale', 7.5))

    # Generador con semilla fija
    generator = torch.Generator("cuda").manual_seed(seed)

    # Generar la imagen
    image = pipe(
        prompt=prompt,
        negative_prompt=negative_prompt,
        num_inference_steps=num_inference_steps,
        guidance_scale=guidance_scale,
        width=width,
        height=height,
        generator=generator
    ).images[0]

    # Guardar como archivo temporal
    temp_path = "/tmp/generated_image.png"
    image.save(temp_path)

    # Subir a tmpfiles.org
    try:
        with open(temp_path, 'rb') as f:
            response = requests.post("https://tmpfiles.org/api/v1/upload", files={'file': f})
        response.raise_for_status()
        url = response.json().get("data", {}).get("url")
    except Exception as e:
        return jsonify({"error": "Error al subir la imagen", "details": str(e)}), 500

    # Devolver la URL de la imagen
    return jsonify({"image_url": url})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get("PORT", 5000)))
