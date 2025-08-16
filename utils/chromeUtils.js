export function sendContentMessage(action, data) {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
            const tabId = tabs[0]?.id;
            if (!tabId) {
                reject(new Error("No active tab found"));
                return;
            }

            const sessionId = await get("sessionId");

            chrome.tabs.sendMessage(tabId, { action, data, sessionId }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(`Action: ${action}\nMessage: ${chrome.runtime.lastError.message}`));
                } else {
                    resolve(response);
                }
            });
        });
    });
}

export function sendBackgroundMessage(action, data) {
    return new Promise(async (resolve, reject) => {
        const sessionId = await get("sessionId");

        chrome.runtime.sendMessage({ action, data, sessionId }, (response) => {
            if (chrome.runtime.lastError) {
                reject(new Error(action, chrome.runtime.lastError.message));
            } else {
                resolve(response);
            }
        });
    });
}

export function get(key) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(key, (result) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(result[key]);
            }
        });
    });
}

export function set(key, value) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [key]: value }, () => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(value);
            }
        });
    });
}

export function removeFromStorage(key) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.remove(key, () => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve();
            }
        });
    });
}

export function setOutputCache(popupData) {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
                return;
            }

            const currentUrl = tabs[0]?.url;
            if (!currentUrl) {
                reject(new Error("No active tab URL found."));
                return;
            }

            chrome.storage.local.get("outputCache", (result) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                    return;
                }

                const outputCache = result.outputCache || {};
                outputCache[currentUrl] = popupData;

                chrome.storage.local.set({ outputCache }, () => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve();
                    }
                });
            });
        });
    });
}

export function getOutputCache() {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs[0]?.url) {
                resolve(null);
                return;
            }

            const currentUrl = tabs[0].url;

            chrome.storage.local.get("outputCache", (result) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                    return;
                }
                const outputCache = result.outputCache || {};
                resolve(outputCache[currentUrl] || null);
            });
        });
    });
}
