import { sendContentMessage, sendBackgroundMessage, get, set, getOutputCache, setOutputCache, removeFromStorage } from "../../utils/chromeUtils.js";
import { safeJsonParse, getPopupText, writeToSummaryContainer } from "../../utils/homeUtils.js";


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

    statusElm.textContent = "";

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
                error("No relevant EULA or agreement found", e.message);
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
            error("An error occurred when generating the LLM response", reviewResponse?.error)
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

    reviewDocument();
});

async function home() {
    console.debug("Initializing popup");

    const popupData = await getOutputCache();
    console.debug("Popup data retrieved:", popupData);
    if (popupData) {
        statusElm.innerHTML = `Review finished`;
        writeToSummaryContainer(getPopupText(popupData), false);
        sendContentMessage("load_response", popupData );
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

function error(message, log) {
    console.debug("Agreeable error: ", log);
    writeToSummaryContainer(message);
    statusElm.textContent = "A problem has occurred";
}

home();