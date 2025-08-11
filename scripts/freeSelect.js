let freeSelectActive = false;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "start_free_select") {
        freeSelectActive = true;
        sendResponse({ success: true });
    }
});

document.addEventListener("mouseup", () => {
    if (!freeSelectActive) return;
    
    const selectedText = window.getSelection().toString();
    
    if (selectedText.length === 0) {
        freeSelectActive = false;
        return;
    }

    const documentData = {
        text: selectedText,
        src: "freeSelect",
    }

    freeSelectActive = false;
    
    // store selected text
    chrome.storage.local.set({ documentData } );
    chrome.runtime.sendMessage({ action: "open_popup" });
});