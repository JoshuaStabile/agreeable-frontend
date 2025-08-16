let prevSessionId = "new";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
        case "load_response":
            console.log(message.sessionId);
            if (prevSessionId === message.sessionId) {
                sendResponse({ success: false });
                return;
            }
            prevSessionId = message.sessionId;

            loadResponse(message.data);
            sendResponse({ success: true });
            break;

        case "highlight_text":
            highlightText(message.data);
            sendResponse({ success: true });
            break;
            
    }
    return true;
});

function cleanText(text) {
    if (!text) return text;
    // replace all occurrences of \" with "
    return text.replace(/\\"/g, '"');
}

function loadResponse(data) {
    const { mainSummary, highlights } = data;

    if (!highlights) {
        return;
    }

    // Clear previous highlights first if needed
    const markInstance = new Mark(document.body);
    markInstance.unmark({
        done: () => {
            // Highlight all texts from LLM response
            highlights.forEach(({ id, text, summary }) => {
                const cleanHighlightText = cleanText(text);

                markInstance.mark(cleanHighlightText, {
                    className: "agreeable-highlight",
                    separateWordSearch: false,
                    acrossElements: true,
                    each: (element) => {
                        element.setAttribute("data-agreeable-highlight-id", id);
                    },
                    done: () => {
                        // Attach tooltip to newly created highlights
                        attachTooltipToHighlights(summary);
                    }
                });
            });
        }
    });
}

function attachTooltipToHighlights(summary) {
    document.querySelectorAll('.agreeable-highlight').forEach(el => {
        if (!el._tippy) {
            tippy(el, {
                content: summary,
                interactive: true,
                placement: 'right',
                maxWidth: 300,
                trigger: 'mouseenter focus click',  // show on hover & click
                hideOnClick: true,                   // auto-hide on clicking outside
                delay: [0, 0],
            });

            el._tippy.props.onShow = () => {
                el.classList.add('clicked');
            };

            el._tippy.props.onHidden = () => {
                el.classList.remove('clicked');
            };
        }
    });
}

function highlightText(id) {
    const elm = document.querySelector(`.agreeable-highlight[data-agreeable-highlight-id="${id}"]`);

    if (elm) {
        // show the tippy if it exists
        if (elm._tippy) {
            document.querySelectorAll(".agreeable-highlight")?.forEach(highlight => {
                highlight._tippy?.hide();
            });

            elm.scrollIntoView({ behavior: "smooth", block: "center" });
            elm._tippy.show();
        }
    } else {
        console.warn(`Highlight with ID ${id} not found`);
    }
}

