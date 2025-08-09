


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
        case "open_popup":
            chrome.action.openPopup();
            return false;

        case "review_document":
            sendResponse({ success: true, result: generateDummyData() });    
            return true;
            fetch("http://127.0.0.1:8000/review_document", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: message.data }),
            })
            .then(response => response.json())
            .then(data => sendResponse({ success: true, result: data }))
            .catch(error => sendResponse({ success: false, error: error.toString() }));

            return true; // respond async
        
    }

});

function generateDummyData() {
    // json string
    return `{
        "mainSummary": "This is a Licensed Application End User License Agreement (EULA) that governs...",
        "highlights": [
            {
                "text": "Licensor grants to you a nontransferable license to use the Licensed Application",
                "summary": "This sentence establishes that you don't actually own the apps"
            },
            {
                "text": "and your license to any Third Party App under this Standard EULA ",
                "summary": "This clause uses broad language to reserve 'all rights'"
            }
        ]
    }`;
    
}