export const PAGES = {
    home: "/pages/home/home.html",
    settings: "/pages/settings/settings.html",
    donate: "/pages/donate/donate.html",
}

export function gotoPage(key) {
    let page = PAGES[key];

    if (page) {
        window.location = page;
        return page;
    } else {
        return null; // not found
    }
}

export function getPage(location) {
    for (let [key, value] of Object.entries(PAGES)) {
        if (value === location) {
            return key;
        }
    }
    return null; // not found
}

export function isCurrentPage(newPage) {
    return getPage(window.location.pathname) === newPage;
}