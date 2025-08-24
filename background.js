import { get, set, setOutputCache, removeFromStorage } from "./utils/chromeUtils.js";
import { safeJsonParse } from "../../utils/llmUtils.js";

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
        (async () => {
            try {
                await set("inProgress", true);

                const customPrompt = await get("$customPrompt");
                const extensionId = chrome.runtime.id;

                const body = JSON.stringify({ text: message.data, customPrompt, extensionId });

                const response = await fetch("https://agreeable.webbybox.net/review_document", {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body
                });

                if (!response.ok) {
                    const text = await response.text();
                    throw new Error(`HTTP ${response.status}: ${text}`);
                }

                set("sessionId", crypto.randomUUID());

                const data = await response.json();

                // parse, store, and remove documentData here
                // do this all in background script so it will save response even if use closes the popup
                const parsedData = safeJsonParse(data);
                setOutputCache(parsedData);
                await removeFromStorage("documentData");

                await set("inProgress", false);
                chrome.runtime.sendMessage({ action: "reviewFinished", result: parsedData });
                sendResponse({ success: true, result: parsedData });
            } catch (error) {
                console.error("Error during fetch:", error);
                await set("inProgress", false);
                sendResponse({ success: false, error: error.toString() });
            }
        })();

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

chrome.runtime.onInstalled.addListener((details) => {
    assignDefaults();

    // only on install open ula tab
    if (details.reason === "install") {
        chrome.tabs.create({ url: "https://agreeable.webbybox.net/eula" });
    }
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