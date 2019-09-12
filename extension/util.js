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
function escapeHtml(text) {
    var map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };

    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}
