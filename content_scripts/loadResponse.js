let prevSessionId = "new";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
        case "load_response":
            if (prevSessionId === message.sessionId) {
                sendResponse({ success: false });
                return;
            }
            prevSessionId = message.sessionId;

            setTimeout(() => {
                loadResponse(message.data);
                sendResponse({ success: true });
            }, 500);
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

    // clear prev marks
    const markInstance = new Mark(document.body);
    markInstance.unmark({
        done: () => {
            highlights.forEach(({ id, text, summary, severity }) => {
                const cleanHighlightText = cleanText(text);

                // escape regex special characters in the text
                const escapedText = cleanHighlightText.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

                // Build a regex that ignores punctuation and special chars
                // \w = word characters, \W = non-word, allow any non-word char between letters
                const regexStr = escapedText.split("").map(ch => {
                    if (/\w/.test(ch)) return ch;
                    return "\\W*"; // match any non-word character 0 or more times
                }).join("");

                const regex = new RegExp(regexStr, "gi");

                // Highlight using markRegExp
                markInstance.markRegExp(regex, {
                    className: "agreeable-highlight",
                    separateWordSearch: false,
                    acrossElements: true,
                    each: (element) => {
                        element.setAttribute("data-agreeable-highlight-id", id);
                        element.setAttribute("data-agreeable-severity", severity);
                    },
                    done: () => {
                        attachTooltipToHighlights(summary, severity);
                    }
                });
            });
        }
    });
}


function attachTooltipToHighlights(summary, severity) {
    document.querySelectorAll(".agreeable-highlight").forEach(el => {
        if (!el._tippy) {
            tippy(el, {
                content: summary,
                interactive: true,
                placement: "right",
                maxWidth: 300,
                delay: [0, 0],
                theme: "agreeable",
                onShow: (instance) => {
                    el.classList.add("clicked");
                    
                    instance.popper
                        .querySelector(".tippy-box")
                        .setAttribute("data-agreeable-severity", severity);
                },
                onHidden: () => {
                    el.classList.remove("clicked");
                }
            });
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

