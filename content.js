let popup = null;
let hoverTimer = null;

// ── language helpers ──────────────────────────────────────────────────────────

function containsArabic(text) { return /[؀-ۿ]/.test(text); }

function isArabicChar(ch) {
    return /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/.test(ch);
}

function getTranslator() {
    return new Promise(resolve =>
        chrome.storage.sync.get(['translator', 'targetLang'], r => {
            if (r.translator) return resolve(r.translator);
            if (r.targetLang === 'en') return resolve('en.sahih');
            resolve('ur.jalandhry');
        })
    );
}

// ── translation ───────────────────────────────────────────────────────────────

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
    if (data?.responseStatus === 200 && data?.responseData?.translatedText) {
        return data.responseData.translatedText;
    }
    return null;
}

// Run both translations in parallel and call onUpdate as each arrives.
// Returns the final combined result.
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
    // data can be a plain string (loading/error) or { word, quranic }
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
            const divider = document.createElement('div');
            divider.className = 'tr-divider';
            frag.appendChild(divider);
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

// ── popup ─────────────────────────────────────────────────────────────────────

function showPopup(x, y, data) {
    removePopup();
    popup = document.createElement('div');
    popup.id = 'quran-translate-popup';

    const closeBtn = document.createElement('span');
    closeBtn.id = 'quran-translate-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', removePopup);

    const contentEl = document.createElement('div');
    contentEl.id = 'quran-translate-text';
    contentEl.appendChild(buildPopupContent(data));

    popup.appendChild(closeBtn);
    popup.appendChild(contentEl);
    popup.style.left = `${x}px`;
    popup.style.top  = `${y}px`;
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

// ── word detection ────────────────────────────────────────────────────────────

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

// ── Feature 1: text selection ─────────────────────────────────────────────────

document.addEventListener('mouseup', async (e) => {
    const sel  = window.getSelection();
    const text = sel ? sel.toString().trim() : '';
    if (!text || text.length < 2) return;

    let x, y;
    if (sel.rangeCount > 0) {
        const rect = sel.getRangeAt(0).getBoundingClientRect();
        x = rect.left + window.scrollX;
        y = rect.bottom + window.scrollY + 8;
    } else {
        x = e.pageX; y = e.pageY + 10;
    }

    showPopup(x, y, 'ترجمہ ہو رہا ہے…');
    try {
        await translateText(text, result => updatePopup(result));
    } catch {
        updatePopup('خطا: ترجمہ نہیں ہو سکا۔');
    }
});

// ── Feature 2: hover translation ─────────────────────────────────────────────

document.addEventListener('mousemove', (e) => {
    clearTimeout(hoverTimer);
    if (window.getSelection().toString().trim()) return;
    if (popup) return;

    hoverTimer = setTimeout(async () => {
        const word = getWordAtPoint(e.clientX, e.clientY);
        if (!word) return;
        showPopup(e.pageX + 10, e.pageY + 10, 'ترجمہ ہو رہا ہے…');
        try {
            await translateText(word, result => updatePopup(result));
        } catch {
            removePopup();
        }
    }, 700);
});

document.addEventListener('mousedown', (e) => {
    clearTimeout(hoverTimer);
    if (popup && !popup.contains(e.target)) removePopup();
});
