function sendContentMessage(action, data) {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id;
        if (!tabId) {
            reject(new Error("No active tab found"));
            return;
        }
        chrome.tabs.sendMessage(tabId, { action, data }, (response) => {
            console.log(action, data);
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
            } else {
                resolve(response);
            }
        });
        });
    });
}

function sendBackgroundMessage(action, data) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action, data }, (response) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
            } else {
                resolve(response);
            }
        });
    });
}

function getFromStorage(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (result) => {
      resolve(result[key]);
    });
  });
}


document.addEventListener("DOMContentLoaded", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]?.url) return;
    const currentUrl = tabs[0].url;

    chrome.storage.local.get("storedPopupData", ({ storedPopupData }) => {
        if (storedPopupData && storedPopupData.url === currentUrl && storedPopupData.popupData) {
            // We have saved data for this page, show it
            const popupText = getPopupText(storedPopupData.popupData);
            const summaryContainer = document.getElementById("summary-container");
            summaryContainer.innerHTML = popupText;
            attachPopupContainerListeners();

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


document.getElementById("reviewBtn").addEventListener("click", async () => {
    const summaryContainer = document.getElementById("summary-container");
    summaryContainer.innerHTML = "Formatting document...";

    try {
        const documentText = await getFromStorage("documentText");
        console.log(documentText);

        if (!documentText) {
            // Send get_document message and wait for response
            const documentResponse = await sendContentMessage("get_document_text", documentText);
            console.log(documentResponse);
            if (!documentResponse?.text) {
                summaryContainer.innerHTML = "No relevant EULA or agreement found.";
                return;
            }
        }
        
        // cleanDocumentText();

        summaryContainer.innerHTML = "Reviewing...";

        // Send review_document message and wait for response
        const reviewResponse = await sendBackgroundMessage("review_document", documentText);

        if (reviewResponse?.success) {
            const parsedData = safeJsonParse(reviewResponse.result);
            summaryContainer.innerHTML = getPopupText(parsedData);
            attachPopupContainerListeners();
            await sendContentMessage("load_response", parsedData);
            storePopupData(parsedData);
        } else {
            summaryContainer.innerHTML = `Error: ${reviewResponse?.error || "Unknown error"}`;
        }
    } catch (err) {
        console.error(err);
        summaryContainer.innerHTML = `Error: ${err.message || err}`;
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
            <li data-agreeable-sentence-id="${highlight.id}">${highlight.summary || ''}</li>
          `)
          .join('')
      }
    </ol>
  `;
}

function attachPopupContainerListeners() {
    document.querySelectorAll('li[data-agreeable-sentence-id]').forEach(li => {
        li.style.cursor = 'pointer';

        li.addEventListener('click', () => {
            const sentenceId = li.getAttribute('data-agreeable-sentence-id');
            const sentenceSummary = li.textContent;

            if (!sentenceId || !sentenceSummary) return;

            const data = { sentenceId, sentenceSummary };

            // Send message to content script to highlight sentence
            sendContentMessage("highlight_sentence", data);
        });
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