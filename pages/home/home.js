import { sendContentMessage, sendBackgroundMessage, get, set, getOutputCache, setOutputCache, removeFromStorage } from "../../utils/chromeUtils.js";
import { getPopupText, writeToSummaryContainer } from "../../utils/homeUtils.js";

chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "reviewFinished") {
        showFinishedState(message.result);
    }
});

const statusElm = document.getElementById("statusText");
const reviewBtn = document.getElementById('reviewBtn');
const freeSelectBtn = document.getElementById('freeSelectBtn');

async function startFreeSelect() {
    console.debug("startFreeSelect called");
    await sendContentMessage("start_free_select");
    window.close();
}

async function reviewDocument() {
    console.debug("reviewDocument started");
    showThinkingState();

    try {
        let documentData = await get("documentData");
        if (!documentData) {
            console.debug("No document data found in storage, requesting load_document");
            try {
                const loadDocumentResponse = await sendContentMessage("load_document", null);
                documentData = loadDocumentResponse.documentData;
                console.debug("Received document data from content script");
            }
            catch (e) {
                showError("No relevant EULA or agreement found", e.message);
                return;
            }
        }

        console.debug("Sending document text to background for review");
        const reviewResponse = await sendBackgroundMessage("fetch_llm_response", documentData.text);

        if (!reviewResponse?.success) {
            showError("An error occurred when generating the LLM response", reviewResponse?.error);
        }
    } catch (err) {
        showError(`Error: ${err.message || err}`, err);
    }
}

freeSelectBtn.addEventListener("click", async () => {
    console.debug("Free select button clicked");
    await startFreeSelect();
});

reviewBtn.addEventListener("click", () => {
    console.debug("Review button clicked");

    reviewDocument();
});

function showReadyState(documentData) {
    reviewBtn.disabled = false;

    if (!documentData) {
        statusElm.textContent = "Ready to review";
        return;
    }

    if (documentData.src === "freeSelect") {
        statusElm.innerHTML = `Ready to review <i>selected text</i>`;
    } else {
        statusElm.innerHTML = `Ready to review <i>page</i>`;
    }
}

function showThinkingState() {
    writeToSummaryContainer(`
        <div class="ai-thinking">
            <span>AI reviewing document</span>
            <div class="thinking-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `, false);
    statusElm.textContent = "Analysis in progress…";

    reviewBtn.disabled = true;
}

function showFinishedState(popupData) {
    writeToSummaryContainer(getPopupText(popupData), false);
    statusElm.innerHTML = "Review finished";

    sendContentMessage("load_response", popupData);
    reviewBtn.disabled = false;
}

function showError(message, log) {
    reviewBtn.disabled = false;

    console.debug("Agreeable error:", log);
    writeToSummaryContainer(message);
    statusElm.textContent = "A problem has occurred";
}


async function home() {
    console.debug("Initializing popup");

    const inProgress = await get("inProgress");
    if (inProgress) {
        showThinkingState();
        return;
    }

    const popupData = await getOutputCache();
    if (popupData) {
        console.debug("Popup data retrieved:", popupData);
        showFinishedState(popupData);
        sendContentMessage("load_response", popupData);
    }

    const documentData = await get("documentData");
    if (documentData) {
        showReadyState(documentData);
        console.debug("Document text found in storage at init");
    }
}

home();