// background.js or service_worker.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "analyzeText") {
        fetch("http://127.0.0.1:8000/review_document", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: request.data }),
        })
        .then(response => response.json())
        .then(data => sendResponse({ success: true, result: data }))
        .catch(error => sendResponse({ success: false, error: error.toString() }));

        return true; // Indicates you will respond asynchronously
    }
});
