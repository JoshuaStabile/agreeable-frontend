const KEYWORDS = [
    "end user license agreement",
    "terms and conditions",
    "terms of service",
    "terms of use",
    "user agreement",
    "eula"
];

let dummyResponseData = {
  "main_summary": "This is a Licensed Application End User License Agreement (EULA) that governs how you can use apps downloaded from Apple's App Store. The document establishes that apps are licensed to you (not sold), meaning you don't own them but have permission to use them under specific terms. The license can be either Apple's standard agreement or a custom one from the app developer. Apple retains most rights to their apps, while third-party developers retain rights to their apps, and users are granted only limited usage rights.",
  "highlights": [
    {
      "id": "sentence_id_75",
      "summary": "This sentence establishes that you don't actually own the apps you download - you're only licensing them. This means Apple or the app developer retains ownership and can potentially revoke your access under certain conditions, limiting your rights compared to traditional software purchases."
    },
    {
      "id": "sentence_id_78",
      "summary": "This clause uses broad language to reserve 'all rights' not expressly granted to users. This is potentially concerning because it gives the licensor maximum control while minimizing user rights, and the phrase 'all rights' is quite expansive and could be interpreted very broadly in the company's favor."
    }
  ]
};

let TAGNAME = "agreeable-sentence";

let globalSentenceId = 1;

function formatEULA(text) {
    const sentenceSplitRegex = /(?<=[.?!])\s+(?=[A-Z0-9(])/;
    const sentences = text.split(sentenceSplitRegex);
    return sentences.map(sentence => {
        const span = document.createElement(TAGNAME);
        span.setAttribute(`data-${TAGNAME}-id`, `sentence_id_${globalSentenceId++}`);
        span.textContent = sentence + ' '; // preserve space
        return span;
    });
}

function wrapSentences(node) {
    // Base case: if it's a text node with actual content
    if (node.nodeType === Node.TEXT_NODE) {
        const text = node.nodeValue.trim();
        if (text.length === 0) return; // skip empty text

        const fragments = formatEULA(text);
        const parent = node.parentNode;
        if (parent) {
            fragments.forEach(span => parent.insertBefore(span, node));
            parent.removeChild(node);
        }
        return;
    }

    // If it's an element node, recursively process children
    if (node.nodeType === Node.ELEMENT_NODE) {
        const childNodes = Array.from(node.childNodes); // static copy
        childNodes.forEach(child => wrapSentences(child));
    }
}

function getFilteredElms(elements, k) {
    // Helper: count how many keywords are in text (case-insensitive)
    function keywordCount(text) {
        const lower = text.toLowerCase();
        return KEYWORDS.reduce((count, k) => count + (lower.includes(k) ? 1 : 0), 0);
    }

    // Score each element
    let scoredElements = elements
        .map(el => {
            const text = el.innerText.trim();
            if (text.length < 50) return null;  // skip too short
            const count = keywordCount(text);
            if (count === 0) return null;

            // Simple scoring: keyword hits times text length (or any formula you prefer)
            const score = count * Math.log(text.length);
            return {el, text, score};
        })
        .filter(Boolean);

    // Remove nested duplicates:
    // If element A contains element B, keep only the higher scoring one
    scoredElements = scoredElements.filter(({el, score}, i, arr) => {
        return !arr.some(({el: otherEl, score: otherScore}, j) => {
            if (i === j) return false;
            if (otherEl.contains(el)) {
                // if container has higher or equal score, skip current element
                return otherScore >= score;
            }
            return false;
        });
    });

    // Sort by score descending
    scoredElements.sort((a, b) => b.score - a.score);

    return scoredElements.filter(s => s.score >= k);
}

function parseContent() {
    const bodyText = document.body.innerText.toLowerCase();
    const foundKeyword = KEYWORDS.find(keyword => bodyText.includes(keyword));
    if (!foundKeyword) {
        console.log("No EULA/ToS keywords found on this page.");
        return;
    }

    const elements = Array.from(document.querySelectorAll("section, div, article, main, p"));

    // Pick top N or all above threshold
    const filtered = getFilteredElms(elements, 1); 

    if (filtered.length === 0) {
        console.log("No sufficiently relevant EULA sections found.");
        return;
    }

    filtered.forEach(({el}) => {
        wrapSentences(el);
    });

    // Combine text for output
    const combinedText = [...document.querySelectorAll("agreeable-sentence")]
        .map(el => el.outerHTML)
        .join();

    console.log(`Found EULA-related content (${foundKeyword}):\n\n`, combinedText);

    return combinedText;
}

function sendAnalyzeRequest(data) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: "analyzeText", data: data }, (response) => {
        if (response && response.success) {
            console.log("Claude result:", response.result);
            resolve(response.result);
        } else {
            console.error("Claude error:", response?.error || "Unknown error");
            reject(response?.error || new Error("Unknown error"));
        }
        });
    });
}

function showSummaryPopup(text, x, y) {
    let popup = document.getElementById('agreeable-popup');

    if (!popup) {
        popup = document.createElement('div');
        popup.id = 'agreeable-popup';
        document.body.appendChild(popup);
    }

    popup.textContent = text;
    popup.style.display = 'block';
    popup.style.left = `${x + 10}px`;
    popup.style.top = `${y + 10}px`;
}

function loadResponse(data) {
    const { mainSummary, highlights } = data;

    // Highlight spans
    highlights.forEach(highlight => {
        const { id, summary } = highlight;
        const el = document.querySelector(`[data-${TAGNAME}-id="${id}"]`);
        if (el) {
            el.className = 'agreeable-highlighted-sentence';
            el.dataset.summary = summary;

            el.addEventListener('click', event => {
                showSummaryPopup(summary, event.pageX, event.pageY);
            });
        }
    });

    // Show summary
    /*
    const summaryBox = document.createElement('div');
    summaryBox.style.position = 'fixed';
    summaryBox.style.bottom = '10px';
    summaryBox.style.right = '10px';
    summaryBox.style.background = '#fff';
    summaryBox.style.border = '1px solid #ccc';
    summaryBox.style.padding = '10px';
    summaryBox.style.maxWidth = '300px';
    summaryBox.style.fontSize = '14px';
    summaryBox.style.zIndex = '9999';
    summaryBox.innerHTML = `<strong>Summary:</strong><br>${mainSummary}`;
    document.body.appendChild(summaryBox);
    */
}

async function execute() {
    try {
        const content = parseContent();

        if (content.length === 0) {
            console.log("No content found to analyze");
            return;
        }

        const responseData = dummyResponseData; // await sendAnalyzeRequest(content.slice(0, 200));

        // If responseData is a JSON string, parse it; if already object, just use it.
        let data;
        if (typeof responseData === "string") {
            data = JSON.parse(responseData);
        } else {
            data = responseData;
        }

        loadResponse(data);
    } catch (error) {
        console.error("Error during analysis:", error);
    }
    
}



window.addEventListener("load", async () => {
    execute();
    // setTimeout(execute, 1000); // wait for lazy-loaded content
});

