chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "get_document_text") {
        const text = getDocumentText();
        sendResponse({ success: true, text });
        return true;
    }
});

function getDocumentText() {
    const article = new Readability(document.cloneNode(true)).parse();
    if (!article) return null;

    return article.textContent.trim();
}

