function isSimpleInput(elem) {
    if (elem.tagName === "TEXTAREA") {
        return true;
    } else if (elem.tagName === "INPUT" && (elem.type === "text" || elem.type === "search")) {
        return true;
    }
    return false;
}

function isInput(elem) {
    if (isSimpleInput(elem)) return true;
    if (elem.hasAttribute("contenteditable")) return true;
}
