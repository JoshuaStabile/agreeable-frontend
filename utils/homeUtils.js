import { sendContentMessage } from "./chromeUtils.js";

const summaryContainer = document.getElementById("summary-container");

export function getPopupText(data) {
    return `
        <b>Main Summary:</b>
        <p>${data.mainSummary || 'No Summary'}</p>

        <br />
        <b>Highlights:</b>
        <ol>
        ${
            (data.highlights || [])
            .map(highlight => `
                <li class="agreeable-highlight-item" data-agreeable-highlight-id="${highlight.id}" data-agreeable-severity=${highlight.severity}>${highlight.summary || ''}</li>
            `)
            .join('')
        }
        </ol>
    `;
}

export function safeJsonParse(str) {
    try {
        // Remove markdown code fences if they slip in
        const cleanStr = str
            .replace(/```json/gi, '')
            .replace(/```/g, '')
            .trim();
        return JSON.parse(cleanStr);
    } catch (e) {
        console.error("JSON parse error:", e, str);
        return null;
    }
}

export function writeToSummaryContainer(html, scroll = true) {
    summaryContainer.innerHTML = ''; // Clear container

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    let wordSpeed;
    if (scroll) {
        wordSpeed = 100;
    }
    else {
        wordSpeed - 0; // instant
    }

    function attachPopupContainerListeners(li) {
        li.addEventListener('click', async () => {
            const id = li.getAttribute('data-agreeable-highlight-id');
            if (!id) return;

            // Send message to content script to highlight sentence
            await sendContentMessage("highlight_text", id);
        });
    }

    async function processNodes(nodes, parent) {
        for (const node of nodes) {
            if (node.nodeType === Node.TEXT_NODE) {
                await typeText(node.textContent, parent);
            } 
            else if (node.nodeType === Node.ELEMENT_NODE) {
                const el = document.createElement(node.tagName);

                // Copy attributes
                for (const attr of node.attributes) {
                    el.setAttribute(attr.name, attr.value);
                }

                parent.appendChild(el);

                // If this is a <li>, add listeners here
                if (el.tagName === 'LI') {
                    attachPopupContainerListeners(el);
                }

                await processNodes(node.childNodes, el);
            }
        }
    }

    // Helper to type out text word-by-word with delay
    function typeText(text, parent) {
        return new Promise(resolve => {
        const words = text.split(/\s+/).filter(w => w.length > 0);
        let index = 0;

        function addWord() {
            if (index < words.length) {
                // Append space if needed
                if (parent.lastChild && parent.lastChild.nodeType === Node.TEXT_NODE) {
                    parent.lastChild.textContent += (index === 0 ? '' : ' ') + words[index];
                } 
                else {
                    parent.appendChild(document.createTextNode(words[index]));
                }
                index++;
                setTimeout(addWord, wordSpeed);
            } 
            else {
                resolve();
            }
        }

        addWord();
        });
    }

    processNodes(tempDiv.childNodes, summaryContainer);
}


