import { get, set } from "./utils/chromeUtils.js";
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.debug(message.action);

    switch (message.action) {
        case "open_popup":
            chrome.action.openPopup();
            return false;

        case "reset":
            chrome.storage.local.clear(() => {
                if (chrome.runtime.lastError) {
                    sendResponse({ success: false, error: chrome.runtime.lastError });
                } else {
                    assignDefaults();
                    sendResponse({ success: true });
                }
            });
            return true;

        case "fetch_llm_response":
            console.log(message);

            get("$customPrompt")
                .then(customPrompt => {
                    const extensionId = chrome.runtime.id;

                    let body = JSON.stringify({ 
                        text: message.data,
                        customPrompt,
                        extensionId,
                    });

                    return fetch("http://127.0.0.1:8000/review_document", {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body
                    });
                })
                .then(response => {
                    if (!response.ok) {
                        return response.text().then(text => { 
                            throw new Error(`HTTP ${response.status}: ${text}`);
                        });
                    }
                    return response.json();
                })
                .then(data => sendResponse({ success: true, result: data }))
                .catch(error => {
                    console.error("Error during fetch:", error);
                    sendResponse({ success: false, error: error.toString() });
                });


            return true; // keep async
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

chrome.runtime.onInstalled.addListener(() => {
    assignDefaults();
});

function assignDefaults() {
    const DEFAULT_SENSITIVITY = "80";

    chrome.storage.local.get(["$sensitivity", "$customPrompt"], (items) => {
        if (!items.$sensitivity) {
            chrome.storage.local.set({ "$sensitivity": DEFAULT_SENSITIVITY });
        }
    });
}


function generateDummyData() {
    // json string
    return `{
        "mainSummary": "This is a Licensed Application End User License Agreement (EULA) that governs...",
        "highlights": [
            {
                "id": 1,
                "text": "Licensor grants to you a nontransferable license to use the Licensed Application",
                "summary": "This sentence establishes that you don't actually own the apps",
                "severity": "medium",
            },
            {
                "id": 2,
                "text": "and your license to any Third Party App under this Standard EULA ",
                "summary": "This clause uses broad language to reserve 'all rights'",
                "severity": "medium",
            }
        ]
    }`;
    
}