const recentlyRedirected = new Set();

function shouldRedirect(url) {
    if (!url) return false;
    if (!/\.pdf(\?.*)?$/i.test(url)) return false;
    if (url.includes('docs.google.com')) return false;
    if (url.includes(chrome.runtime.id)) return false;
    return true;
}

function redirectPdf(tabId, url) {
    if (!shouldRedirect(url)) return;
    if (recentlyRedirected.has(tabId)) return;

    recentlyRedirected.add(tabId);
    setTimeout(() => recentlyRedirected.delete(tabId), 5000);

    let targetUrl;
    if (url.startsWith('file://')) {
        // Local PDF → extension's built-in PDF.js viewer
        targetUrl = chrome.runtime.getURL('viewer.html') + '?file=' + encodeURIComponent(url);
    } else {
        // Remote PDF → Google Docs Viewer (content scripts can inject here)
        targetUrl = 'https://docs.google.com/viewer?url=' + encodeURIComponent(url);
    }

    chrome.tabs.update(tabId, { url: targetUrl });
}

// Fires early in navigation — best chance to intercept before Chrome PDF viewer starts
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
    if (details.frameId === 0) redirectPdf(details.tabId, details.url);
});

// Fallback for cases where onBeforeNavigate doesn't fire (e.g. direct file:// open)
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.url) redirectPdf(tabId, changeInfo.url);
});
