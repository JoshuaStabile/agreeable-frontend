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