import { get, set } from "../../utils/chromeUtils.js";

const sensitivitySelect = document.getElementById("sensitivity-select");
const customPromptTextarea = document.getElementById("custom-prompt");

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
    await set("$customPrompt", customPromptTextarea.value);
});