import { get, set } from "../../utils/chromeUtils.js";

const sensitivitySelect = document.getElementById("sensitivity-select");
const customPromptTextarea = document.getElementById("custom-prompt");
const resetBtn = document.getElementById("reset-extension");

document.addEventListener("DOMContentLoaded", async () => {
    const sensitivity = await get("$sensitivity");
    if (sensitivity) {
        sensitivitySelect.value = sensitivity;
    }

    const customPrompt = await get("$customPrompt");
    if (customPrompt) {
        customPromptTextarea.value = customPrompt;
    }
});

sensitivitySelect.addEventListener("change", async () => {
    await set("$sensitivity", parseInt(sensitivitySelect.value));
});

customPromptTextarea.addEventListener("input", async () => {
    // save up to 256 chars
    await set("$customPrompt", customPromptTextarea.value.slice(0, 256));
});

resetBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to reset the extension? All settings will be lost.")) {
        chrome.runtime.sendMessage({ action: "reset" }, (response) => {
            if (response?.success) {
                alert("Extension reset successfully.");
                window.location.reload();
            } else {
                alert("Failed to reset extension.");
            }
        });
    }
});