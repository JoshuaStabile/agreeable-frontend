chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.debug(message.action);
    switch (message.action) {
        case "open_popup":
            chrome.action.openPopup();
            chrome.storage.local.set({ mode: message.mode });
            sendResponse({ success: true });
            return false;

        case "reset":
            chrome.local.storage.clear();
            break;

        case "fetch_llm_response":
            // sendResponse({ success: true, result: generateDummyData() });    return true;
            fetch("http://127.0.0.1:8000/review_document", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: message.data }),
            })
            .then(response => response.json())
            .then(data => sendResponse({ success: true, result: data }))
            .catch(error => sendResponse({ success: false, error: error.toString() }));

            return true; // respond async
        
    }

});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
    chrome.storage.local.remove('documentData', () => {
        if (chrome.runtime.lastError) {
            console.error("Error clearing documentData:", chrome.runtime.lastError);
        } else {
            console.debug("Cleared documentData on tab switch");
        }
    });
});


function generateDummyData() {
    // json string
    return `{
        "mainSummary": "This is a Licensed Application End User License Agreement (EULA) that governs...",
        "highlights": [
            {
                "id": 1,
                "text": "Licensor grants to you a nontransferable license to use the Licensed Application",
                "summary": "This sentence establishes that you don't actually own the apps"
            },
            {
                "id": 2,
                "text": "and your license to any Third Party App under this Standard EULA ",
                "summary": "This clause uses broad language to reserve 'all rights'"
            }
        ]
    }`;
    
}