"""
High-accuracy Arabic OCR server using EasyOCR (deep learning).

Run command (use the conda pose environment where easyocr is installed):
    conda run -n pose python ocr-server-easyocr.py

Keep the terminal open while using the extension.
First run downloads the Arabic model (~200 MB), then works offline with no rate limits.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image, ImageFilter, ImageOps
import easyocr
import numpy as np
import base64
import io

app = Flask(__name__)
# Allow Chrome extension pages (chrome-extension://) to call this localhost server
CORS(app, resources={r"/*": {"origins": "*"}})

print("Loading EasyOCR Arabic model (downloads ~200 MB on first run, then offline)...")
reader = easyocr.Reader(['ar'], gpu=False)   # set gpu=True if you have CUDA
print("EasyOCR ready.\n")


def preprocess(img: Image.Image) -> np.ndarray:
    """Sharpen + binarise the image — improves accuracy on scanned pages."""
    img = img.convert('L')                      # grayscale
    img = img.filter(ImageFilter.SHARPEN)       # sharpen edges
    img = ImageOps.autocontrast(img)            # stretch contrast
    return np.array(img)


@app.route('/health')
def health():
    return jsonify({'status': 'ok', 'engine': 'easyocr'})


@app.route('/ocr', methods=['POST'])
def ocr():
    data = request.get_json(silent=True)
    if not data or 'image' not in data:
        return jsonify({'error': 'No image provided'}), 400

    try:
        img_bytes = base64.b64decode(data['image'])
        img       = Image.open(io.BytesIO(img_bytes))
        img_np    = preprocess(img)

        # detail=0 returns plain text; paragraph=True merges nearby lines
        results = reader.readtext(img_np, detail=0, paragraph=True)
        text    = '\n'.join(r for r in results if r.strip())

        return jsonify({'text': text.strip(), 'engine': 'easyocr'})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    print("EasyOCR server running at http://localhost:5002")
    print("Keep this window open while using the Quran Translator extension.\n")
    app.run(host='127.0.0.1', port=5002, debug=False)
