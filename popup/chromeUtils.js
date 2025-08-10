export function sendContentMessage(action, data) {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id;
        if (!tabId) {
            reject(new Error("No active tab found"));
            return;
        }
        chrome.tabs.sendMessage(tabId, { action, data }, (response) => {
            console.log(action, data);
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
            } else {
                resolve(response);
            }
        });
        });
    });
}

export function sendBackgroundMessage(action, data) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action, data }, (response) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
            } else {
                resolve(response);
            }
        });
    });
}

export function getFromStorage(key) {
    return new Promise((resolve) => {
        chrome.storage.local.get(key, (result) => {
            resolve(result[key]);
        });
    });
}

export function removeFromStorage(key) {
    return new Promise(() => {
        chrome.storage.local.remove(key);
    });
}