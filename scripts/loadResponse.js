chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
        case "load_response":
            loadResponse(message.data);
            sendResponse({ success: true });

        case "highlight_text":
            highlightText(message.data);
            sendResponse({ success: true });
            
    }
});

function loadResponse(data) {
    const { mainSummary, highlights } = data;

    console.log(highlights);
    if (!highlights) {
        return;
    }

    // Clear previous highlights first if needed
    const markInstance = new Mark(document.body);
    markInstance.unmark({
        done: () => {
        // Highlight all texts from LLM response
        highlights.forEach(({ text, summary }) => {
            markInstance.mark(text, {
            className: "agreeable-highlight",
            separateWordSearch: false,
            acrossElements: true,
            done: () => {
                // Attach tooltip to newly created highlights
                attachTooltipToHighlights(text, summary);
            }
            });
        });
        }
    });

    // Optionally do something with mainSummary (e.g., show in UI)
    console.log("Document summary:", mainSummary);
}

function attachTooltipToHighlights(text, summary) {
    // Find all highlighted elements with this text (marked with .agreeable-highlight)
    // Because mark.js wraps text in <mark> tags or spans with the class
    document.querySelectorAll('.agreeable-highlight').forEach(el => {
        // Only attach tooltip once per element
        if (!el._tippy) {
        tippy(el, {
            content: summary,
            interactive: true,
            placement: 'right',
            maxWidth: 300,
            delay: [100, 200],
        });
        }
    });
}

function highlightText({ text }) {
    // Scroll to first occurrence of the text (if exists)
    const el = document.body.innerText.includes(text)
        ? document.evaluate(
            `//*[contains(text(), "${text}")]`,
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
        ).singleNodeValue
        : null;

    if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
}
