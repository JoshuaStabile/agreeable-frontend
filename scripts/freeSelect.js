let freeSelectActive = false;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "start_free_select") {
        freeSelectActive = true;
    }
});

document.addEventListener("mouseup", () => {
    if (!freeSelectActive) return;

    const selectedText = window.getSelection().toString();
    
    freeSelectActive = false;
        
    // store selected text
    chrome.storage.local.set({ documentText: selectedText }, () => {
        // clear selection
        window.getSelection().removeAllRanges();

        // open popup
        chrome.runtime.sendMessage({ action: "open_popup" });
    });

    
});
