async function initPopup() {
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
        }
        else {
            statusElm.innerHTML = `Ready to review <i>page</i>`;
        }
        
        console.debug("Document text found in storage at init");
    }
}

initPopup();
