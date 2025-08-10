async function scanDocument() {
    try {
        // check if the program should even run
        if (!shouldRun()) {
            return;
        }
        
        const documentText = getDocumentText();
        chrome.storage.local.set({ documentText }, () => {
            // open popup
            chrome.runtime.sendMessage({ action: "open_popup" });
        });
    } catch (error) {
        console.error("Error during analysis:", error);
    }
}

window.addEventListener("load", scanDocument);