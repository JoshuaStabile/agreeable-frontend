async function scanDocument() {
    try {
        // check if the program should even run
        if (!shouldRun()) {
            console.log("!shouldRun")
            return;
        }

        chrome.runtime.sendMessage({ action: "open_popup" });
    } catch (error) {
        console.error("Error during analysis:", error);
    }
}


window.addEventListener("load", scanDocument);

