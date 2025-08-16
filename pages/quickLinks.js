import { PAGES, getPage, gotoPage, isCurrentPage } from "../config/pages.js";

function addQuickLinkListeners() {
    const homeLinkElm = document.getElementById("homeLink");
    const settingsLinkElm = document.getElementById("settingsLink");
    const donateLinkElm = document.getElementById("donateLink");

    homeLinkElm.addEventListener("click", (e) => {
        if (!isCurrentPage("home")) {
            gotoPage("home");
        }
    });

    settingsLinkElm.addEventListener("click", (e) => {
        if (!isCurrentPage("settings")) {
            gotoPage("settings");
        }
    });

    donateLinkElm.addEventListener("click", (e) => {
        if (!isCurrentPage("donate")) {
            gotoPage("donate");
        }
    });
}

addQuickLinkListeners();