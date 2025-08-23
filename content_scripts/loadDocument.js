chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "load_document") {
        loadDocument().then((documentData) => {
            sendResponse({ success: true, documentData });
        });
        return true; // keep channel open for async response
    }
});

async function loadDocument() {
    const article = new Readability(document.cloneNode(true)).parse();
    if (!article) return null;

    const documentText = article.textContent.trim();

    const documentData = {
        text: documentText,
        src: "loadDocument",
    }

    await chrome.storage.local.set({ documentData });
    return documentData;
}

