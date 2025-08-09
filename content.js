let TAGNAME = "agreeable-sentence";

let globalSentenceId = 1;

let highlightContainerOffset = 10;

const KEYWORDS = [
    "terms", "conditions", "agreement", "license", "eula",
    "warranty", "liability", "arbitration", "jurisdiction",
    "binding", "governing law"
];

// Clause number patterns (1., 1.1, I., etc.)
const CLAUSE_REGEX = /^(\d+(\.\d+)*|[IVXLCDM]+\.)\s/;

async function openPopupRequest(text) {
    await chrome.runtime.sendMessage({ action: "open_popup", text });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log(message.action);
    switch (message.action) {
        case "load_response": 
            loadResponse(message.data);
            sendResponse({ success: true });
            break;
        case "highlight_sentence":
            highlightSentence(message.data);
            sendResponse({ success: true });
            break;
        default:
            sendResponse({ success: false });
    }
});

function highlightSentence(sentenceData) {
    const { sentenceId, sentenceSummary } = sentenceData;

    console.log(sentenceData);

    const targetSpan = document.querySelector(`agreeable-sentence[data-agreeable-sentence-id="${sentenceId}"]`);
    
    if (targetSpan) {
        targetSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // get bounding rect relative to viewport
        const rect = targetSpan.getBoundingClientRect() ;

        const x = window.scrollX + rect.left;
        const y = window.scrollY + rect.top;

        showSummaryPopup(sentenceSummary, x, y);
    }
}


function showSummaryPopup(text, x, y) {
    let container = document.getElementById('agreeable-highlight-container');

    // Update container content & position
    container.textContent = text;
    container.style.left = `${x + highlightContainerOffset}px`;
    container.style.top = `${y + highlightContainerOffset}px`;
    container.style.display = 'block';
}

function createHighlightContainer() {
    let container = document.createElement('div');
    container.id = 'agreeable-highlight-container';
    document.body.appendChild(container);

    return container;
}

function loadResponse(data) {
    const { mainSummary, highlights } = data;

    let container = document.getElementById('agreeable-highlight-container');

    if (!container) {
        container = createHighlightContainer();
    }

    // Add listeners to highlights
    highlights.forEach(({id, summary}) => {
    const el = document.querySelector(`[data-${TAGNAME}-id="${id}"]`);
    if (el) {
        el.classList.add('agreeable-highlighted-sentence');

        el.addEventListener('click', event => {
            event.stopPropagation();

            showSummaryPopup(summary, event.pageX, event.pageY);
        });
    }
    });

    // Hide container on any click outside
    document.addEventListener('click', () => {
        container.style.display = 'none';
    });
}


// --- Remove unwanted elements --- //
function stripNoise() {
    const junkSelectors = [
        'nav', 'header', 'footer', 'aside', 'form',
        'script', 'style', 'noscript',
        '.sidebar', '.toolbar', '.share', '.social', '.ads',
        '[aria-hidden="true"]', '.hidden', '[style*="display:none"]'
    ];
    document.querySelectorAll(junkSelectors.join(',')).forEach(el => el.remove());
}

// --- Scoring logic --- //
function scoreElement(el) {
    const text = el.innerText.trim();
    if (text.length < 200) return 0;

    const lower = text.toLowerCase();
    let score = text.split(/\s+/).length; // base on length

    // Keyword hits
    score += KEYWORDS.reduce((acc, k) => acc + (lower.includes(k) ? 50 : 0), 0);

    // Clause pattern boost
    const lines = text.split("\n").map(l => l.trim());
    const clauseCount = lines.filter(l => CLAUSE_REGEX.test(l)).length;
    score += clauseCount * 10;

    // Structural boosts
    score += el.querySelectorAll("p").length * 5;
    score += el.querySelectorAll("li").length * 3;

    return score;
}

// --- Sentence wrapping --- //
function wrapSentences(node) {
    if (node.nodeType === Node.TEXT_NODE) {
        const trimmed = node.nodeValue.trim();
        if (!trimmed) return;

        const sentenceSplitRegex = /(?<=[.?!])\s+(?=[A-Z0-9(])/;
        const sentences = trimmed.split(sentenceSplitRegex);

        const parent = node.parentNode;
        sentences.forEach(s => {
            const span = document.createElement(TAGNAME);
            span.setAttribute(`data-${TAGNAME}-id`, `${globalSentenceId++}`);
            span.textContent = s + ' ';
            parent.insertBefore(span, node);
        });
        parent.removeChild(node);
        return;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
        [...node.childNodes].forEach(child => wrapSentences(child));
    }
}

// --- Main extraction --- //
function parseContent() {
    // early exit if no EULA keywords anywhere
    const bodyText = document.body.innerText.toLowerCase();
    if (!KEYWORDS.some(k => bodyText.includes(k))) {
        console.log("No EULA/ToS keywords found.");
        return null;
    }

    // strip obvious noise
    stripNoise();

    // score candidates
    const candidates = Array.from(document.querySelectorAll("main, article, section, div"))
        .map(el => ({ el, score: scoreElement(el) }))
        .filter(o => o.score > 0);

    if (candidates.length === 0) {
        console.log("No sufficiently relevant sections found.");
        return null;
    }

    // pick top scoring element
    const top = candidates.sort((a, b) => b.score - a.score)[0].el;

    // wrap into sentence tags
    wrapSentences(top);

    const combinedText = [...top.querySelectorAll(TAGNAME)]
        .map(el => el.textContent.trim())
        .join(" ");

    return combinedText;
}


function shouldRun() {
    const threshold = 0.75;

    // === URL pattern === //
    const urlPatterns = /terms|eula|user[-_ ]agreement|license|legal|tos|conditions/i;
    const urlScore = urlPatterns.test(window.location.href) ? 1 : 0;

    // === Title & heading analysis === //
    const headingKeywords = [
        "terms of service",
        "terms and conditions",
        "end user license agreement",
        "user agreement",
        "license agreement",
        "legal information",
        "eula"
    ];

    const title = document.title.toLowerCase();
    const h1 = document.querySelector("h1")?.innerText.toLowerCase() || "";
    const h2 = document.querySelector("h2")?.innerText.toLowerCase() || "";

    let titleScore = 0;
    for (let keyword of headingKeywords) {
        if (title.includes(keyword) || h1.includes(keyword) || h2.includes(keyword)) {
            titleScore = 1;
            break;
        }
    }

    // === Keyword density in body text === //
    const bodyText = document.body.innerText.toLowerCase();
    const legalKeywords = [
        "governing law", "binding arbitration", "termination", "warranty", "liability",
        "disclaimer", "intellectual property", "modification of terms", "personal data",
        "third-party services", "indemnify", "limitations of liability", "jurisdiction"
    ];

    let matchCount = 0;
    for (let word of legalKeywords) {
        if (bodyText.includes(word)) {
            matchCount++;
        }
    }

    const keywordDensityScore = matchCount / legalKeywords.length;

    // === Weighted scoring === //
    const finalScore = (
        (urlScore * 0.4) +
        (titleScore * 0.3) +
        (keywordDensityScore * 0.3)
    );

    console.log("Final EULA score:", finalScore.toFixed(2));
    return finalScore >= threshold;
}


async function scanDocument() {
    try {
        // check if the program should even run
        if (!shouldRun()) {
            console.log("!shouldRun")
            return;
        }

        // extract the page content
        const content = parseContent();

        if (!content || content.length === 0) {
            console.log("No content found to analyze");
            return;
        }

        console.log(content);

        // request to open popup
        await openPopupRequest(content.slice(0, 200));

    } catch (error) {
        console.error("Error during analysis:", error);
    }
}


window.addEventListener("load", scanDocument);

