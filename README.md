# Quran Inline Translator — Chrome Extension

A Chrome extension that translates selected Arabic (Quranic) text inline on any webpage. It matches the selection against the Quran API, shows the verse reference and Urdu/English translation in a floating popup, and falls back to a general Arabic→Urdu translator for non-Quranic text.

Also intercepts PDF navigation and renders PDFs through a built-in viewer so content scripts can inject into them.

---

## Features

- Select any Arabic text → floating translation popup appears instantly
- Quran-aware: shows surah/ayah reference when a verse is matched
- Falls back to MyMemory general translation for non-Quranic text
- OCR support for images containing Arabic text (three backends — see below)
- Built-in PDF viewer with full translation support
- Translator and target language configurable from the popup

---

## Prerequisites

- Google Chrome (or any Chromium-based browser)
- Node.js 18+ (for the local Tesseract OCR server)
- Python 3.8+ with `easyocr`, `flask`, `flask-cors`, `Pillow` installed (for the high-accuracy OCR server — optional)

---

## Setup

### 1. Install Node dependencies

```bash
npm install
```

### 2. Load the extension in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select this project folder

The extension icon will appear in your toolbar.

---

## Running the OCR Servers

The extension supports three OCR backends. You only need to run the server(s) you want to use.

### Option A — EasyOCR (Python, port 5002) — higher accuracy

Downloads the Arabic deep-learning model (~200 MB on first run, then works offline).

```bash
# If you use conda (replace 'pose' with your env name if different):
conda run -n pose python ocr-server-easyocr.py

# Or with plain Python:
pip install flask flask-cors easyocr Pillow
python ocr-server-easyocr.py
```

Keep the terminal open while using the extension.

### Option B — Tesseract.js (Node, port 5001)

Fully offline, no API key required. Uses the bundled `ara.traineddata` model.

```bash
node ocr-server.js
```

Keep the terminal open while using the extension.

### Option C — OCR.space cloud API (no local server needed)

1. Get a free API key (25 000 requests/month) at [ocr.space/ocrapi](https://ocr.space/ocrapi)
2. Click the extension icon and paste the key into the **OCR.space API Key** field

---

## Usage

1. Open any webpage containing Arabic text
2. Select the Arabic text with your mouse
3. A floating popup appears with the Urdu translation (and verse reference if it is a Quranic ayah)
4. To change the translator or target language, click the extension icon

For PDFs, simply open a `.pdf` URL or file — the extension intercepts it and loads the built-in viewer automatically.

---

## Configuration

| Setting | Where | Description |
|---|---|---|
| Translator | Extension popup | Choose between Jalandhri, Junagarhi, Maududi (Urdu) or Sahih Intl., Asad (English) |
| OCR.space API key | Extension popup | Required only if using the cloud OCR backend |

---

## Project Structure

```
manifest.json          Chrome extension manifest (MV3)
background.js          Service worker — PDF interception
content.js             Content script — text selection, translation popup
popup.html / popup.js  Extension toolbar popup (settings)
style.css              Popup and tooltip styles
viewer.html/js/css     Built-in PDF.js viewer
ocr-server.js          Local Tesseract.js OCR server (Node, port 5001)
ocr-server-easyocr.py  Local EasyOCR server (Python, port 5002)
tessdata/              Tesseract language data directory
ara.traineddata        Arabic trained data for Tesseract
pdf.min.js             PDF.js library bundle
pdf.worker.min.js      PDF.js worker bundle
tesseract.*.js/.wasm   Tesseract.js in-browser bundles
```

---

## APIs Used

- [AlQuran Cloud API](https://alquran.cloud/api) — verse search and translation (free, no key)
- [MyMemory Translation API](https://mymemory.translated.net) — general Arabic translation (free, no key)
- [OCR.space API](https://ocr.space/ocrapi) — cloud OCR (free tier, API key required)
