import { get, set } from "./utils/chromeUtils.js";
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.debug(message.action);

    switch (message.action) {
        case "open_popup":
            chrome.action.openPopup();
            set("mode", message.mode)
                .then(() => sendResponse({ success: true }))
                .catch(err => sendResponse({ success: false, error: err.toString() }));
            return true; // keep channel open

        case "reset":
            chrome.storage.local.clear(() => {
                if (chrome.runtime.lastError) {
                    sendResponse({ success: false, error: chrome.runtime.lastError });
                } else {
                    sendResponse({ success: true });
                }
            });
            return true;

        case "fetch_llm_response":
            get("$customPrompt")
                .then(customPrompt => {
                    let body = JSON.stringify({ 
                        text: message.data,
                        customPrompt,
                    });

                    console.log("Sending body:", body);

                    return fetch("http://127.0.0.1:8000/review_document", {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body
                    });
                })
                .then(response => response.json())
                .then(data => sendResponse({ success: true, result: data }))
                .catch(error => sendResponse({ success: false, error: error.toString() }));

            return true; // async response
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
                "summary": "This sentence establishes that you don't actually own the apps",
                "severity": "yellow",
            },
            {
                "id": 2,
                "text": "and your license to any Third Party App under this Standard EULA ",
                "summary": "This clause uses broad language to reserve 'all rights'",
                "severity": "yellow",
            }
        ]
    }`;
    
}