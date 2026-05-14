/**
 * Local OCR server for the Quran Inline Translator extension.
 * Run once: node ocr-server.js
 * Keep the terminal open while using the extension.
 *
 * Uses tesseract.js (already installed) + the bundled ara.traineddata.
 * No API keys, no rate limits, fully offline.
 */

const express   = require('express');
const cors      = require('cors');
const Tesseract = require('tesseract.js');
const path      = require('path');

const app  = express();
const PORT = 5001;

// Allow requests from Chrome extension pages
app.use(cors({
    origin: (origin, cb) => {
        if (!origin || origin.startsWith('chrome-extension://')) cb(null, true);
        else cb(new Error('Not allowed'));
    }
}));
app.use(express.json({ limit: '20mb' }));

// Reuse one worker so initialization (few seconds) only happens once
let worker = null;

async function getWorker() {
    if (worker) return worker;
    console.log('Initializing Tesseract worker (first request only)…');
    worker = await Tesseract.createWorker('ara', 1, {
        langPath: path.join(__dirname, 'tessdata'),
        gzip:     false,   // ara.traineddata is uncompressed
        logger:   () => {} // silence progress logs
    });
    console.log('Tesseract worker ready.');
    return worker;
}

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.post('/ocr', async (req, res) => {
    const { image } = req.body || {};
    if (!image) return res.status(400).json({ error: 'No image provided' });

    try {
        const w = await getWorker();
        const buf = Buffer.from(image, 'base64');
        const { data: { text } } = await w.recognize(buf);
        res.json({ text: text.trim() });
    } catch (err) {
        console.error('OCR error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, '127.0.0.1', () => {
    console.log(`\nOCR server running at http://localhost:${PORT}`);
    console.log('Keep this window open while using the Quran Translator extension.\n');
});
