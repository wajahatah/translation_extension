const translatorEl = document.getElementById('translator');
const ocrKeyEl     = document.getElementById('ocrKey');

chrome.storage.sync.get(['translator', 'targetLang', 'ocrKey'], (r) => {
    if (r.translator) translatorEl.value = r.translator;
    else if (r.targetLang === 'en') translatorEl.value = 'en.sahih';

    if (r.ocrKey) ocrKeyEl.value = r.ocrKey;
});

translatorEl.addEventListener('change', () => {
    chrome.storage.sync.set({ translator: translatorEl.value });
});

ocrKeyEl.addEventListener('input', () => {
    chrome.storage.sync.set({ ocrKey: ocrKeyEl.value.trim() });
});
