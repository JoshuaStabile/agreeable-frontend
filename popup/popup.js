function sendMessage(action, data) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]?.id) return;

        chrome.tabs.sendMessage(tabs[0].id, { action, data });
    });
}

document.addEventListener("DOMContentLoaded", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]?.url) return;
    const currentUrl = tabs[0].url;

    chrome.storage.local.get("storedPopupData", ({ storedPopupData }) => {
        if (storedPopupData && storedPopupData.url === currentUrl && storedPopupData.parsedData) {
            // We have saved data for this page, show it
            const popupText = getPopupText(storedPopupData.popupData);
            const summaryContainer = document.getElementById("summary-container");
            summaryContainer.innerHTML = popupText;
            attachPopupContainerListeners();

            // Also send highlights & summary to content script to highlight on page
            sendMessage("load_response", storedPopupData.popupData);
        }
    });
    });

});


document.getElementById("reviewBtn").addEventListener("click", () => {
    const summaryContainer = document.getElementById("summary-container");

    chrome.storage.local.get("documentText", ({ documentText }) => {
        if (!documentText) {
            summaryContainer.innerHTML = "No document detected.";
            return;
        }

        summaryContainer.innerHTML = "Reviewing...";

        chrome.runtime.sendMessage(
        {
            action: "review_document",
            data: documentText
        },
        (response) => {
            if (response?.success) {
                var parsedData = JSON.parse(response.result);
                var popupText = getPopupText(parsedData);

                summaryContainer.innerHTML = popupText;
                attachPopupContainerListeners();

                // Now send the highlights & summary to content script
                sendMessage("load_response", parsedData);

                storePopupData(parsedData, popupText);
            } else {
                document.getElementById("result").innerHTML = `Error: ${response?.error || "Unknown error"}`;
            }
        }
        );
    });
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
            sendMessage("highlight_sentence", data);
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