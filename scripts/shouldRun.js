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