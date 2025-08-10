chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
        case "load_response":
            loadResponse(message.data);
            sendResponse({ success: true });
            break;

        case "highlight_text":
            highlightText(message.data);
            sendResponse({ success: true });
            break;
            
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
        highlights.forEach(({ id, text, summary }) => {
            markInstance.mark(text, {
            className: "agreeable-highlight",
            separateWordSearch: false,
            acrossElements: true,
            each: (element) => {
                element.setAttribute("data-agreeable-highlight-id", id);
            },
            done: () => {
                // Attach tooltip to newly created highlights
                attachTooltipToHighlights(text, summary);
            }
            });
        });
        }
    });
}

function attachTooltipToHighlights(text, summary) {
    document.querySelectorAll('.agreeable-highlight').forEach(el => {
        if (!el._tippy) {
            const tip = tippy(el, {
                content: summary,
                interactive: true,
                placement: 'right',
                maxWidth: 300,
                trigger: 'mouseenter focus click',  // show on hover & click
                hideOnClick: true,                   // auto-hide on clicking outside
                delay: [0, 100],
            });

            el.addEventListener('click', (e) => {
                e.stopPropagation();      // prevent click bubbling
                el.classList.add('clicked');
            });

            // Remove 'clicked' when tooltip hides
            el._tippy.props.onHidden = () => {
                el.classList.remove('clicked');
            };
        }
    });
}

function highlightText(id) {
    const elm = document.querySelector(`.agreeable-highlight[data-agreeable-highlight-id="${id}"]`);

    if (elm) {
        elm.scrollIntoView({ behavior: "smooth", block: "center" });
        elm.classList.add('agreeable-highlight');

        // show the tippy if it exists
        if (elm._tippy) {
            elm._tippy.show();
        }
    } else {
        console.warn(`Highlight with ID ${id} not found`);
    }
}

