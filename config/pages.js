export const PAGES = {
    home_full: "/pages/home/full/home_full.html",
    home_compact: "/pages/home/compact/home_compact.html",
    
    settings: "/pages/settings/settings.html",
}

export function setPage(key) {
    let page = PAGES[key];

    if (page) {
        window.location = page;
        return true;
    } else {
        return false;
    }
}