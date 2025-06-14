// server.js
const express = require('express');
const { execFile } = require('child_process');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const app = express();

app.get('/generate', async (req, res) => {
  const {
    prompt = '',
    negative_prompt = '',
    seed = '42',
    width = '768',
    height = '768',
    num_inference_steps = '30',
    guidance_scale = '7.5',
  } = req.query;

  try {
    // Ejecutar el script de Python
    await new Promise((resolve, reject) => {
      execFile(
        'python3',
        [
          'generate.py',
          prompt,
          negative_prompt,
          seed,
          width,
          height,
          num_inference_steps,
          guidance_scale
        ],
        (error, stdout, stderr) => {
          if (error) {
            reject(stderr || stdout || error);
          } else {
            resolve();
          }
        }
      );
    });

    // Subir la imagen generada a tmpfiles.org
    const form = new FormData();
    form.append('file', fs.createReadStream('/tmp/generated.png'));

    const uploadRes = await axios.post('https://tmpfiles.org/api/v1/upload', form, {
      headers: form.getHeaders()
    });

    const url = uploadRes.data?.data?.url || null;
    if (!url) throw new Error('Error al obtener el enlace de imagen');

    res.json({ image_url: url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error generando o subiendo la imagen', details: err.toString() });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor Node.js escuchando en el puerto ${PORT}`);
});
