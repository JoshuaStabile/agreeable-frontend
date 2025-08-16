import { get, removeFromStorage } from "./utils/chromeUtils.js";
import { PAGES, setPage } from "../config/pages.js"

const HOME_PAGE = "/popup/home/full/home_full.html";

let page = await get("page") || HOME_PAGE;
console.debug("Popup page from storage:", page);
removeFromStorage("page");

setPage(page);