async function shouldRun() {
    const result = await new Promise((resolve) => {
        chrome.storage.local.get("$sensitivity", resolve);
    });

    const sensitivity = result["$sensitivity"];
    if (!sensitivity) {
        return false;
    } 

    console.log(sensitivity);

    // === URL pattern === //
    const urlPatterns = /terms|eula|user[-_ ]agreement|license|legal|tos|conditions/i;
    const urlScore = urlPatterns.test(window.location.href) ? 100 : 0; // scale to 0-100

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
            titleScore = 100; // scale to 0-100
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

    const keywordDensityScore = (matchCount / legalKeywords.length) * 100; // scale to 0-100

    // === Weighted scoring === //
    const finalScore = Math.round(
        (urlScore * 0.4) +
        (titleScore * 0.3) +
        (keywordDensityScore * 0.3)
    );

    console.debug("Final EULA score:", finalScore);
    console.debug("sensitivity sensitivity:", sensitivity);
    return finalScore >= sensitivity;
}


window.addEventListener("load", async () => {
    const agreementDetected = await shouldRun();

    console.log(agreementDetected);

    // check if the program should even run
    if (!agreementDetected) {
        return;
    }
    
    loadDocument();

    // open popup
    chrome.runtime.sendMessage({ action: "open_popup", mode: "compact" });
    
});