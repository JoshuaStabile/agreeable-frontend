import { sendContentMessage, sendBackgroundMessage, get, set, getOutputCache, setOutputCache, removeFromStorage } from "../../utils/chromeUtils.js";
import { full, compact, safeJsonParse, getPopupText, writeToSummaryContainer } from "../../utils/homeUtils.js";


const statusElm = document.getElementById("statusText");
const reviewBtn = document.getElementById('reviewBtn');
const freeSelectBtn = document.getElementById('freeSelectBtn');
const toggleSizeBtn = document.getElementById("toggleSizeBtn");

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    console.debug("Received message:", message.action);
    if (message.action === "review_document") {
        try {
            await reviewDocument();
            console.debug("reviewDocument finished");
            sendResponse({ success: true });
        } catch (e) {
            console.error("Error in reviewDocument:", e);
            sendResponse({ success: false, error: e.message });
        }
    }
    return true;
});

async function startFreeSelect() {
    console.debug("startFreeSelect called");
    await sendContentMessage("start_free_select");
    window.close();
}

async function reviewDocument() {
    console.debug("reviewDocument started");
    
    // show thinking state
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

    statusElm.textContent = "Reviewing with AI...";
    statusElm.classList.add('status-active');

    window.getSelection().removeAllRanges();
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
                console.debug("Failed to load document data:", e);
                writeToSummaryContainer("No relevant EULA or agreement found.");
                statusElm.textContent = "";
                return;
            }
        }
        let documentText = documentData.text;

        console.debug("Sending document text to background for review");
        const reviewResponse = await sendBackgroundMessage("fetch_llm_response", documentText);

        if (reviewResponse?.success) {
            // set new session after each successful review
            set("sessionId", crypto.randomUUID());

            console.debug("Received successful review response");
            const parsedData = safeJsonParse(reviewResponse.result);
            const popupText = getPopupText(parsedData);
            writeToSummaryContainer(popupText);

            sendContentMessage("load_response", parsedData);
            setOutputCache(parsedData);
            await removeFromStorage("documentData");
            statusElm.textContent = "Analysis complete";
        } else {
            console.debug("Review response failed:", reviewResponse?.error);
            writeToSummaryContainer(`Error: ${reviewResponse?.error || "Unknown error"}`);
        }
    } catch (err) {
        console.error("Error in reviewDocument:", err);
        writeToSummaryContainer(`Error: ${err.message || err}`);
        statusElm.textContent = "";
    }
}

freeSelectBtn.addEventListener("click", async () => {
    console.debug("Free select button clicked");
    await startFreeSelect();
});

reviewBtn.addEventListener("click", () => {
    console.debug("Review button clicked");

    // on review document, set to full
    full();

    reviewDocument();
});

toggleSizeBtn.addEventListener('click', () => {
    console.debug("Toggle Size button clicked");
    if (document.body.classList.contains("compact")) {
        full();
    } else {
        compact();
    }
});

async function home() {
    console.debug("Initializing popup");

    let mode = await get("mode");
    console.debug("Popup mode from storage:", mode);
    removeFromStorage("mode");

    const popupData = await getOutputCache();
    console.debug("Popup data retrieved:", popupData);
    if (popupData) {
        full();

        statusElm.innerHTML = `Review finished`;
        writeToSummaryContainer(getPopupText(popupData), false);
        sendContentMessage("load_response", popupData );
    } else {
        if (mode === "compact") {
            console.debug("Setting popup to compact mode");
            compact();
        } else {
            console.debug("Setting popup to full mode");
            full();
        }
    }

    const documentData = await get("documentData");
    if (documentData) {
        if (documentData.src === "freeSelect") {
            statusElm.innerHTML = `Ready to review <i>selected text</i>`;
        } else {
            statusElm.innerHTML = `Ready to review <i>page</i>`;
        }
        
        console.debug("Document text found in storage at init");
    } 
}


home();