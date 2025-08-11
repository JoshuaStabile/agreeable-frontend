chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.debug(message);
    if (message.action === "load_document") {
        const documentData = loadDocument();
        sendResponse({ success: true, documentData });
    }
    return true;
});

function loadDocument() {
    const article = new Readability(document.cloneNode(true)).parse();
    if (!article) return null;

    const documentText = article.textContent.trim();

    const documentData = {
        text: documentText,
        src: "loadDocument",
    }

    chrome.storage.local.set({ documentData });
    return documentText;
}

