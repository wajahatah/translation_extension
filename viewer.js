// ── PDF.js setup ─────────────────────────────────────────────────────────────
pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('pdf.worker.min.js');

const params = new URLSearchParams(location.search);
const pdfUrl = params.get('file');
const infoEl = document.getElementById('page-info');

let pdfDoc = null;
let scale  = 1.5;
let popup  = null;

// ── helpers ───────────────────────────────────────────────────────────────────

function containsArabic(text) { return /[؀-ۿ]/.test(text); }
function isArabicChar(ch)     { return /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/.test(ch); }

function getTranslator() {
    return new Promise(resolve =>
        chrome.storage.sync.get(['translator', 'targetLang'], r => {
            if (r.translator) return resolve(r.translator);
            if (r.targetLang === 'en') return resolve('en.sahih');
            resolve('ur.jalandhry');
        })
    );
}

async function fetchQuranTranslation(text, translator) {
    const searchRes  = await fetch(
        `https://api.alquran.cloud/v1/search/${encodeURIComponent(text)}/all/ar`
    );
    const searchData = await searchRes.json();
    if (searchData?.status !== 'OK' || !searchData?.data?.matches?.length) return null;

    const match    = searchData.data.matches[0];
    const surahNum = match?.surah?.number;
    const ayahNum  = match?.numberInSurah;
    const surahEn  = match?.surah?.englishName || '';
    if (!surahNum || !ayahNum) return null;

    const transRes  = await fetch(
        `https://api.alquran.cloud/v1/ayah/${surahNum}:${ayahNum}/${translator}`
    );
    const transData = await transRes.json();
    if (transData?.status !== 'OK' || !transData?.data?.text) return null;

    return { ref: `${surahEn} ${surahNum}:${ayahNum}`, text: transData.data.text };
}

async function generalTranslate(text, target) {
    const langPair = (containsArabic(text) ? 'ar' : 'autodetect') + '|' + target;
    const res  = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`
    );
    const data = await res.json();
    return (data?.responseStatus === 200 && data?.responseData?.translatedText)
        ? data.responseData.translatedText : null;
}

async function translateText(text, onUpdate) {
    const translator = await getTranslator();
    const target     = translator.split('.')[0];
    const result     = { word: null, quranic: null };

    const wordPromise = generalTranslate(text, target)
        .then(t  => { result.word    = t; onUpdate({ ...result }); })
        .catch(() => {});

    const quranicPromise = fetchQuranTranslation(text, translator)
        .then(q  => { result.quranic = q; onUpdate({ ...result }); })
        .catch(() => {});

    await Promise.allSettled([wordPromise, quranicPromise]);
    return result;
}

// ── popup DOM builder ─────────────────────────────────────────────────────────

function buildPopupContent(data) {
    const frag = document.createDocumentFragment();

    if (typeof data === 'string') {
        const el = document.createElement('div');
        el.className = 'tr-text';
        el.textContent = data;
        frag.appendChild(el);
        return frag;
    }

    const { word, quranic } = data;

    if (word) {
        const label = document.createElement('div');
        label.className = 'tr-label';
        label.textContent = 'Word translation';
        const text = document.createElement('div');
        text.className = 'tr-text';
        text.textContent = word;
        frag.appendChild(label);
        frag.appendChild(text);
    }

    if (quranic) {
        if (word) {
            const d = document.createElement('div');
            d.className = 'tr-divider';
            frag.appendChild(d);
        }
        const label = document.createElement('div');
        label.className = 'tr-label';
        label.textContent = quranic.ref;
        const text = document.createElement('div');
        text.className = 'tr-text';
        text.textContent = quranic.text;
        frag.appendChild(label);
        frag.appendChild(text);
    }

    if (!word && !quranic) {
        const el = document.createElement('div');
        el.className = 'tr-text';
        el.textContent = 'ترجمہ دستیاب نہیں۔';
        frag.appendChild(el);
    }

    return frag;
}

function getWordAtPoint(x, y) {
    const range = document.caretRangeFromPoint(x, y);
    if (!range || range.startContainer.nodeType !== Node.TEXT_NODE) return null;
    const text = range.startContainer.textContent;
    const off  = range.startOffset;
    let s = off, e2 = off;
    while (s > 0  && isArabicChar(text[s - 1])) s--;
    while (e2 < text.length && isArabicChar(text[e2])) e2++;
    if (s >= e2) return null;
    return text.slice(s, e2).trim() || null;
}

// ── OCR — 3-tier priority chain ───────────────────────────────────────────────
//  1. localhost:5002  EasyOCR      (deep learning, best accuracy, Python)
//  2. localhost:5001  Tesseract.js (fast, good, Node.js, already running)
//  3. OCR.space API   (internet fallback, rate-limited)

function getOcrKey() {
    return new Promise(resolve =>
        chrome.storage.sync.get(['ocrKey'], r => resolve(r.ocrKey?.trim() || 'helloworld'))
    );
}

async function tryLocalServer(port, base64Img) {
    const res = await fetch(`http://localhost:${port}/ocr`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ image: base64Img }),
        signal:  AbortSignal.timeout(20000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.text) throw new Error('empty result');
    return data.text;
}

async function runOcr(canvas) {
    const base64 = canvas.toDataURL('image/jpeg', 0.95).split(',')[1];

    // 1 ── EasyOCR (deep learning, highest accuracy)
    try {
        return await tryLocalServer(5002, base64);
    } catch { /* not running — try next */ }

    // 2 ── Tesseract.js local server (backup local)
    try {
        return await tryLocalServer(5001, base64);
    } catch { /* not running — fall back to API */ }

    // 3 ── OCR.space API (internet fallback)
    updatePopup('مقامی سرور نہیں ملا، OCR.space استعمال ہو رہا ہے…');

    const apiKey = await getOcrKey();
    const fd = new FormData();
    fd.append('base64Image', 'data:image/jpeg;base64,' + base64);
    fd.append('language', 'ara');
    fd.append('isOverlayRequired', 'false');
    fd.append('scale', 'true');
    fd.append('detectOrientation', 'true');
    fd.append('OCREngine', '1');
    fd.append('apikey', apiKey);

    const res = await fetch('https://api.ocr.space/parse/image', { method: 'POST', body: fd });

    if (res.status === 429) {
        throw new Error(
            apiKey === 'helloworld'
                ? 'OCR.space demo limit reached (500/day). Run "python ocr-server-easyocr.py" for unlimited local OCR.'
                : 'OCR.space rate limit (429). Try again shortly.'
        );
    }
    if (!res.ok) throw new Error(`OCR API HTTP ${res.status}`);

    const json = await res.json();
    if (json.IsErroredOnProcessing) throw new Error(json.ErrorMessage?.[0] || 'OCR API error');

    const text = json.ParsedResults?.[0]?.ParsedText?.trim();
    if (!text) throw new Error('No text found in selection');
    return text;
}

// ── popup (position: fixed so it stays visible while scrolling) ───────────────

function showPopup(cx, cy, data) {
    removePopup();
    popup = document.createElement('div');
    popup.id = 'quran-translate-popup';

    const closeBtn = document.createElement('span');
    closeBtn.id = 'quran-translate-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.onclick = removePopup;

    const contentEl = document.createElement('div');
    contentEl.id = 'quran-translate-text';
    contentEl.appendChild(buildPopupContent(data));

    popup.appendChild(closeBtn);
    popup.appendChild(contentEl);
    popup.style.left = Math.min(cx, window.innerWidth - 400) + 'px';
    popup.style.top  = Math.min(cy, window.innerHeight - 220) + 'px';
    document.body.appendChild(popup);
}

function updatePopup(data) {
    const el = popup && popup.querySelector('#quran-translate-text');
    if (!el) return;
    el.innerHTML = '';
    el.appendChild(buildPopupContent(data));
}

function removePopup() {
    if (popup) { popup.remove(); popup = null; }
}

// ── zoom ──────────────────────────────────────────────────────────────────────

document.getElementById('zoom-in') .addEventListener('click', () => applyScale(scale + 0.25));
document.getElementById('zoom-out').addEventListener('click', () => applyScale(Math.max(0.5, scale - 0.25)));

function applyScale(newScale) {
    scale = newScale;
    document.getElementById('zoom-level').textContent = Math.round(scale * 100) + '%';
    document.querySelectorAll('.page-container[data-rendered="true"]').forEach(c => {
        c.dataset.rendered = '';
        renderPage(+c.dataset.pageNum, c).then(() => c.dataset.rendered = 'true');
    });
}

// ── PDF loading ───────────────────────────────────────────────────────────────

async function init() {
    if (!pdfUrl) { infoEl.textContent = 'خطا: URL نہیں ملا۔'; return; }

    try {
        pdfDoc = await pdfjsLib.getDocument({ url: pdfUrl }).promise;
        const n = pdfDoc.numPages;
        infoEl.textContent = `کل صفحات: ${n}`;

        const fp = await pdfDoc.getPage(1);
        const vp = fp.getViewport({ scale });
        fp.cleanup();

        const viewerEl = document.getElementById('viewer');
        for (let i = 1; i <= n; i++) {
            const c = document.createElement('div');
            c.className = 'page-container';
            c.dataset.pageNum = i;
            const ph = document.createElement('div');
            ph.className = 'page-placeholder';
            ph.style.width  = vp.width  + 'px';
            ph.style.height = vp.height + 'px';
            ph.textContent  = `صفحہ ${i}`;
            c.appendChild(ph);
            viewerEl.appendChild(c);
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                const c = entry.target;
                if (c.dataset.rendered) return;
                c.dataset.rendered = 'loading';
                renderPage(+c.dataset.pageNum, c)
                    .then(() => c.dataset.rendered = 'true')
                    .catch(() => c.dataset.rendered = '');
            });
        }, { root: document.getElementById('viewer-container'), rootMargin: '500px' });

        viewerEl.querySelectorAll('.page-container').forEach(el => observer.observe(el));

    } catch (err) {
        console.error('PDF load error:', err);
        infoEl.textContent = 'فائل نہیں کھلی۔';
        document.getElementById('error-banner').style.display = 'block';
    }
}

async function renderPage(num, container) {
    const page     = await pdfDoc.getPage(num);
    const viewport = page.getViewport({ scale });

    container.innerHTML = '';
    container.style.width  = viewport.width  + 'px';
    container.style.height = viewport.height + 'px';

    // Canvas layer — always rendered; this is what OCR reads from
    const canvas  = document.createElement('canvas');
    canvas.width  = viewport.width;
    canvas.height = viewport.height;
    container.appendChild(canvas);
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

    // Text layer — optional, only present in non-scanned PDFs
    // Wrapped in try/catch: scanned pages have no text items and renderTextLayer throws
    try {
        const textDiv = document.createElement('div');
        textDiv.className = 'textLayer';
        container.appendChild(textDiv);
        const renderTask = pdfjsLib.renderTextLayer({
            textContentSource: page.streamTextContent(),
            container: textDiv,
            viewport,
            textDivs: []
        });
        await renderTask.promise;
    } catch {
        // No embedded text on this page — OCR mode will handle it
    }

    page.cleanup();
}

// ── Feature 1: text selection → translation ───────────────────────────────────

document.addEventListener('mouseup', async (e) => {
    if (ocrDragging) return;
    const sel  = window.getSelection();
    const text = sel ? sel.toString().trim() : '';
    if (!text || text.length < 2) return;

    const rect = sel.rangeCount > 0 ? sel.getRangeAt(0).getBoundingClientRect() : null;
    showPopup(rect ? rect.left : e.clientX, rect ? rect.bottom + 8 : e.clientY + 10, 'ترجمہ ہو رہا ہے…');
    try { await translateText(text, r => updatePopup(r)); }
    catch { updatePopup('خطا: ترجمہ نہیں ہو سکا۔'); }
});

// ── Feature 2: hover → word translation (text-layer PDFs) ────────────────────

let hoverTimer = null;

document.addEventListener('mousemove', (e) => {
    clearTimeout(hoverTimer);
    if (ocrMode) return;
    if (window.getSelection().toString().trim()) return;
    if (popup) return;

    hoverTimer = setTimeout(async () => {
        const word = getWordAtPoint(e.clientX, e.clientY);
        if (!word) return;
        showPopup(e.clientX + 10, e.clientY + 10, 'ترجمہ ہو رہا ہے…');
        try { await translateText(word, r => updatePopup(r)); }
        catch { removePopup(); }
    }, 700);
});

document.addEventListener('mousedown', (e) => {
    clearTimeout(hoverTimer);
    if (!ocrMode && popup && !popup.contains(e.target)) removePopup();
});

// ── Feature 3: OCR drag-select (scanned PDFs) ────────────────────────────────

let ocrMode     = false;
let ocrDragging = false;
let ocrStart    = null;
let selBoxEl    = null;

document.getElementById('ocr-btn').addEventListener('click', () => {
    ocrMode = !ocrMode;
    const btn = document.getElementById('ocr-btn');
    btn.textContent = ocrMode ? 'OCR فعال ✓' : 'OCR';
    btn.classList.toggle('active', ocrMode);
    document.body.style.cursor = ocrMode ? 'crosshair' : '';
    if (!ocrMode) cleanSel();
});

document.addEventListener('mousedown', (e) => {
    if (!ocrMode) return;
    if (e.target.closest('#toolbar')) return;
    e.preventDefault();
    e.stopPropagation();
    ocrDragging = true;
    ocrStart    = { x: e.clientX, y: e.clientY };
    cleanSel();
    selBoxEl = document.createElement('div');
    selBoxEl.id = 'ocr-sel-box';
    selBoxEl.style.cssText = `left:${e.clientX}px;top:${e.clientY}px;width:0;height:0;`;
    document.body.appendChild(selBoxEl);
}, true);

document.addEventListener('mousemove', (e) => {
    if (!ocrMode || !ocrDragging || !selBoxEl) return;
    const x = Math.min(e.clientX, ocrStart.x);
    const y = Math.min(e.clientY, ocrStart.y);
    const w = Math.abs(e.clientX - ocrStart.x);
    const h = Math.abs(e.clientY - ocrStart.y);
    selBoxEl.style.left   = x + 'px';
    selBoxEl.style.top    = y + 'px';
    selBoxEl.style.width  = w + 'px';
    selBoxEl.style.height = h + 'px';
}, true);

document.addEventListener('mouseup', async (e) => {
    if (!ocrMode || !ocrDragging) return;
    ocrDragging = false;

    const selRect = selBoxEl ? selBoxEl.getBoundingClientRect() : null;
    cleanSel();

    if (!selRect || selRect.width < 10 || selRect.height < 10) return;

    const captured = captureFromCanvases(selRect);
    if (!captured) {
        showPopup(e.clientX, e.clientY + 10, 'کوئی PDF صفحہ منتخب نہیں۔');
        return;
    }

    showPopup(e.clientX, e.clientY + 10, 'OCR چل رہا ہے…');

    try {
        const arabicText = await runOcr(captured);
        updatePopup('ترجمہ ہو رہا ہے…');
        await translateText(arabicText, r => updatePopup(r));
    } catch (err) {
        console.error('OCR error:', err);
        updatePopup('خطا: ' + err.message);
    }
}, true);

function cleanSel() {
    if (selBoxEl) { selBoxEl.remove(); selBoxEl = null; }
}

function captureFromCanvases(selRect) {
    for (const canvas of document.querySelectorAll('.page-container canvas')) {
        const cr = canvas.getBoundingClientRect();
        if (cr.right < selRect.left || cr.left > selRect.right) continue;
        if (cr.bottom < selRect.top  || cr.top  > selRect.bottom) continue;

        const oL = Math.max(selRect.left,   cr.left);
        const oT = Math.max(selRect.top,    cr.top);
        const oR = Math.min(selRect.right,  cr.right);
        const oB = Math.min(selRect.bottom, cr.bottom);

        const sx = canvas.width  / cr.width;
        const sy = canvas.height / cr.height;
        const cx = (oL - cr.left) * sx,  cy = (oT - cr.top) * sy;
        const cw = (oR - oL)      * sx,  ch = (oB - oT)     * sy;

        // 2× upscale for better OCR accuracy
        const off = document.createElement('canvas');
        off.width  = cw * 2;
        off.height = ch * 2;
        const ctx  = off.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, off.width, off.height);
        ctx.scale(2, 2);
        ctx.drawImage(canvas, cx, cy, cw, ch, 0, 0, cw, ch);
        return off;
    }
    return null;
}

init();
