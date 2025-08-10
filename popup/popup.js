import { sendContentMessage, sendBackgroundMessage, getFromStorage, removeFromStorage } from "./chromeUtils.js";

const summaryContainer = document.getElementById("summary-container");
const statusElm = document.getElementById("statusText");
const body = document.getElementById('popup-body');
const expandBtn = document.getElementById('expandBtn');
const reviewBtn = document.getElementById('reviewBtn');
const freeSelectBtn = document.getElementById('freeSelectBtn');

function full() {
    body.classList.remove('compact');
    body.classList.add('full');

    freeSelectBtn.style.display = "block";
    reviewBtn.style.display = "block"; // always show
    expandBtn.style.display = "none";
}

function compact() {
    body.classList.remove('full');
    body.classList.add('compact');

    freeSelectBtn.style.display = "none";
    reviewBtn.style.display = "block"; // always show
    expandBtn.style.display = "block";   
}

function writeToSummaryContainer(html) {
    summaryContainer.innerHTML = ''; // Clear container

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    async function processNodes(nodes, parent) {
        for (const node of nodes) {
            if (node.nodeType === Node.TEXT_NODE) {
                await typeText(node.textContent, parent);
            } 
            else if (node.nodeType === Node.ELEMENT_NODE) {
                const el = document.createElement(node.tagName);

                // Copy attributes
                for (const attr of node.attributes) {
                    el.setAttribute(attr.name, attr.value);
                }

                parent.appendChild(el);

                // If this is a <li>, add listeners here
                if (el.tagName === 'LI') {
                    attachPopupContainerListeners(el);
                }

                await processNodes(node.childNodes, el);
            }
        }
    }

    // Helper to type out text word-by-word with delay
    function typeText(text, parent) {
        return new Promise(resolve => {
        const words = text.split(/\s+/).filter(w => w.length > 0);
        let index = 0;

        function addWord() {
            if (index < words.length) {
                // Append space if needed
                if (parent.lastChild && parent.lastChild.nodeType === Node.TEXT_NODE) {
                    parent.lastChild.textContent += (index === 0 ? '' : ' ') + words[index];
                } 
                else {
                    parent.appendChild(document.createTextNode(words[index]));
                }
                index++;
                setTimeout(addWord, 100);
            } 
            else {
                resolve();
            }
        }

        addWord();
        });
    }

    processNodes(tempDiv.childNodes, summaryContainer);
}

expandBtn.addEventListener('click', full);

document.addEventListener("DOMContentLoaded", async () => {
    compact();

    if (await getFromStorage("documentText")) {
        statusElm.innerHTML = `Text loaded`;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]?.url) return;
        const currentUrl = tabs[0].url;

        chrome.storage.local.get("storedPopupData", ({ storedPopupData }) => {
            if (storedPopupData && storedPopupData.url === currentUrl && storedPopupData.popupData) {
                // We have saved data for this page, show it
                const popupText = getPopupText(storedPopupData.popupData);
                writeToSummaryContainer(popupText);

                // Also send highlights & summary to content script to highlight on page
                sendContentMessage("load_response", storedPopupData.popupData);
            }
        });
    });

});

document.getElementById("freeSelectBtn").addEventListener("click", () => {
    sendContentMessage("start_free_select");
    window.close(); // closes popup so the user can select freely
});





document.getElementById("reviewBtn").addEventListener("click", async () => {
    // Show thinking state
    summaryContainer.innerHTML = `
        <div class="ai-thinking">
            <span>AI reviewing document</span>
            <div class="thinking-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;

    statusText.textContent = "Reviewing with AI...";
    statusText.classList.add('status-active');

    full();

    try {
        const documentText = await getFromStorage("documentText");
        console.log(documentText);

        if (!documentText) {
            writeToSummaryContainer("No relevant EULA or agreement found.");
            return;
        }
        
        // cleanDocumentText();

        // Send review_document message and wait for response
        const reviewResponse = await sendBackgroundMessage("review_document", documentText);

        if (reviewResponse?.success) {
            const parsedData = safeJsonParse(reviewResponse.result);
            const popupText = getPopupText(parsedData);
            writeToSummaryContainer(popupText);

            await sendContentMessage("load_response", parsedData);
            storePopupData(parsedData);

            statusText.textContent = "Analysis complete";
            await removeFromStorage("documentText");
        } else {
            writeToSummaryContainer(`Error: ${reviewResponse?.error || "Unknown error"}`);
        }
    } catch (err) {
        console.error(err);
        writeToSummaryContainer(`Error: ${err.message || err}`);
    }
});

function getPopupText(data) {
    return `
        <b>Main Summary:</b>
        <p>${data.mainSummary || 'No Summary'}</p>

        <b>Highlights</b>
        <ol>
        ${
            (data.highlights || [])
            .map(highlight => `
                <li class="agreeable-highlight-item" data-agreeable-highlight-id="${highlight.id}">${highlight.summary || ''}</li>
            `)
            .join('')
        }
        </ol>
    `;
}

function attachPopupContainerListeners(li) {
    li.addEventListener('click', () => {
        const id = li.getAttribute('data-agreeable-highlight-id');
        if (!id) return;

        // Send message to content script to highlight sentence
        sendContentMessage("highlight_text", id);
    });
}

function storePopupData(popupData) {
    // Store in local storage with the current tab's URL
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]?.url) return;
        const currentUrl = tabs[0].url;

        chrome.storage.local.set({
            storedPopupData: {
                url: currentUrl,
                popupData
            }
        });
    });
}

function safeJsonParse(str) {
    try {
        // Remove markdown code fences if they slip in
        const cleanStr = str
            .replace(/```json/gi, '')
            .replace(/```/g, '')
            .trim();
        return JSON.parse(cleanStr);
    } catch (e) {
        console.error("JSON parse error:", e, str);
        return null;
    }
}