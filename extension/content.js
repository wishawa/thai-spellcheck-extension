
browser.runtime.onMessage.addListener(handleRequest);

function handleRequest(request, sender, callback) {
    if (request.action === "toggleAutoCheck") {
        autoCheckOnDomain = false;
    } else if (request.action === 'getCurrentText') {
        callback(getCurrentText());
    } else {
        alert(`Unknown action: ${request.action}`);
        Tools.track("internal", `Unknown action: ${request.action}`);
    }
}

var currentActiveElement = document.body;
var isActiveElementInput = false;
var currentHighlightOverlay;

var styleElem = document.createElement('style');
styleElem.innerHTML = '\
#tsc-highlight-overlay {\
    position: absolute!important;\
    break-after: avoid!important;\
    box-sizing: border-box!important;\
    margin-block-start: 0!important;\
    margin-block-end: 0!important;\
    color: transparent!important;\
    border: none!important;\
    border-block: none!important;\
    border-inline: none!important;\
    background: transparent!important;\
    -webkit-text-fill-color: transparent!important;\
    -webkit-text-stroke: transparent!important;\
    pointer-events: none!important;\
    resize: none!important;\
    scrollbar-width: none!important;\
}\
#tsc-highlight-overlay *:not(tsc-error-highlight) {\
    color: transparent!important;\
    background: transparent!important;\
    -webkit-text-fill-color: transparent!important;\
    -webkit-text-stroke: transparent!important;\
    border-color: transparent!important;\
    pointer-events: none!important;\
}\
tsc-error-highlight {\
    border-bottom: 2px solid rgba(255,0,0,0.6);\
}\
';
document.body.appendChild(styleElem);

function createHighlightOverlay(elem) {
    if(currentHighlightOverlay && currentHighlightOverlay.parentNode) {
        currentHighlightOverlay.parentNode.removeChild(currentHighlightOverlay);
    }
    var parent = elem.parentNode;
    const styles = window.getComputedStyle(elem);
    if(isSimpleInput(elem)) {
        currentHighlightOverlay = document.createElement('DIV');
        currentHighlightOverlay.id = 'tsc-highlight-overlay';
        if (styles.cssText !== '') {
            currentHighlightOverlay.style.cssText = styles.cssText;
        }
        else {
            const cssText = Object.values(styles).reduce(
                (css, propertyName) =>
                    `${css}${propertyName}:${styles.getPropertyValue(
                        propertyName
                    )};`
                );

            currentHighlightOverlay.style.cssText = cssText;
        }

        currentHighlightOverlay.innerText = elem.value;
    }
    else {
        currentHighlightOverlay = elem.cloneNode(true);
        currentHighlightOverlay.id = 'tsc-highlight-overlay';
    }
    var lh = styles.getPropertyValue('line-height');
    if(lh == '' || lh == 'auto') {
        elem.style.lineHeight = 1.25;
        currentHighlightOverlay.style.lineHeight = 1.25;
    }
    else {
        elem.style.lineHeight = lh;
        currentHighlightOverlay.style.lineHeight = lh;
    }
    if(elem.style.overflowX == '' && elem.style.overflow == '') {
        currentHighlightOverlay.style.overflowX = 'auto';
    }
    if(elem.style.overflowY == '' && elem.style.overflow == '') {
        currentHighlightOverlay.style.overflowY = 'auto';
    }
    var z = window.getComputedStyle(elem, null).getPropertyValue('zIndex');
    z = parseInt(z);
    if(isNaN(z)) {
        elem.style.zIndex = 0;
        z = 0;
    }
    currentHighlightOverlay.style.zIndex = z + 1;
    currentHighlightOverlay.style.width = currentActiveElement.clientWidth + 'px';
    currentHighlightOverlay.style.height = currentActiveElement.clientHeight + 2 + 'px';
    parent.insertBefore(currentHighlightOverlay, elem);
    elem.addEventListener("scroll", doScroll);
    elem.addEventListener("resize", doSize);
    elem.addEventListener("resize", doScroll);
    elem.addEventListener("blur", mainEvent);
    elem.addEventListener("input", mainEvent);
    elem.classList.add('tsc-highlighted-element');

}
function onInput() {
    setTimeout(function() {
        recheckPage(checkText);
    }, 100);
}
async function doSize() {
    if(!currentHighlightOverlay) return 0;
    var parent = currentActiveElement.parentNode;
    const styles = window.getComputedStyle(currentActiveElement);
    currentHighlightOverlay.style.width = currentActiveElement.clientWidth + 'px';
    currentHighlightOverlay.style.height = currentActiveElement.clientHeight + 2 + 'px';

    if(isSimpleInput(currentActiveElement) && !styles.getPropertyValue('line-height')) {
        currentActiveElement.style.lineHeight = 1.25;
        currentHighlightOverlay.style.lineHeight = 1.25;
    }
}
var isActiveElementScrollableY = -1;
var isActiveElementScrollableX = -1;
async function doScroll() {
    if(!currentHighlightOverlay) return 0;
    var e = false;
    var newScrollableY = (currentActiveElement.scrollHeight > currentActiveElement.clientHeight);
    if(isActiveElementScrollableY !== newScrollableY) {
        isActiveElementScrollableY = newScrollableY;
        e = true;
    }
    var newScrollableX = (currentActiveElement.scrollWidth > currentActiveElement.clientWidth);
    if(isActiveElementScrollableX !== newScrollableX) {
        isActiveElementScrollableX = newScrollableX;
        e = true;
    }
    if(e) await doSize();
    currentHighlightOverlay.scrollTop = currentActiveElement.scrollTop;
    currentHighlightOverlay.scrollLeft = currentActiveElement.scrollLeft;
}

async function recheckPage(callback) {
    if(document.activeElement != currentActiveElement) {
        //console.log("active element changed!");
        currentActiveElement.classList.remove('tsc-highlighted-element');
        currentActiveElement.removeEventListener('scroll', doScroll);
        currentActiveElement.removeEventListener('resize', doSize);
        currentActiveElement.removeEventListener('resize', doScroll);
        currentActiveElement.removeEventListener('blur', mainEvent);
        currentActiveElement.removeEventListener('input', mainEvent);
        currentActiveElement = document.activeElement;
        if(isInput(currentActiveElement)) {
            //console.log("New active element is input!");
            isActiveElementScrollableY = -1;
            isActiveElementScrollableX = -1;
            isActiveElementInput = true;
            createHighlightOverlay(currentActiveElement);
        }
        else {
            isActiveElementInput = false;
            if(currentHighlightOverlay && currentHighlightOverlay.parentNode) currentHighlightOverlay.parentNode.removeChild(currentHighlightOverlay);
        }
    }
    if(isActiveElementInput) {
        callback(getCurrentText());
    }
}

function getCurrentText() {
    return getMarkupListOfActiveElement(document.activeElement);
}

// Note: document.activeElement sometimes seems to be wrong, e.g. on languagetool.org
// it sometimes points to the language selection drop down even when the cursor
// is inside the text field - probably related to the iframe...
function getMarkupListOfActiveElement(elem) {
    if (isSimpleInput(elem)) {
        return [{ text: elem.value }];
    } else if (elem.hasAttribute("contenteditable")) {
        return Markup.html2markupList(elem.innerHTML, document);
    } else if (elem.tagName === "IFRAME") {
        const activeElem = elem.contentWindow.document.activeElement;
        if (activeElem.innerHTML) {
            return Markup.html2markupList(activeElem.innerHTML, document);
        } else if (activeElem.textContent) {
            // not sure if this case ever happens?
            return [{ text: activeElem.textContent.toString() }];
        } else {
            throw "placeCursor1";
        }
    } else {
        if (elem) {
            throw "placeCursor2";
        } else {
            throw "placeCursor3";
        }
    }
}
var previousText = [];
var previousResult = [];
function checkText(text) {
    var textToSend = [];
    var textToUse = Array(text.length);
    var toFill = [];
    for(var i=0; i<text.length; i++) {
        if(previousText[i] && 'text' in text[i] && 'text' in previousText[i] && previousText[i]['text'] === text[i]['text']) {
                if('markup' in text[i]) textToUse[i] = {text: previousResult[i]['text'], markup: text[i]['markup']};
                else textToUse[i] = {text: previousResult[i]['text']};
                //console.log("reusing: " + text[i]['text'] + "  " + previousText[i]['text']);
        }
        else {
            if('text' in text[i]) {
                textToSend.push(text[i]['text']);
                toFill.push(i);
                //console.log("sending: " + text[i]['text']);
            }
            else {
                textToUse[i] = text[i];
            }
        }
    }
    var sending = browser.runtime.sendMessage(textToSend);
    sending.catch(function(c) {
        console.warn("tsc spellchecking failed");
    });
    sending.then(function(result) {
        if(result.length != textToSend.length || result.length != toFill.length) throw "incorrect length";
        for(var i=0; i<result.length; i++) {
            var te = textToSend[i];
            var textOffset = 0;
            var cur = 0;
            for(var j=0; j<result[i][1].length; j++) {
                if(result[i][1][j] < cur) {
                    console.warn("Unexpected response");
                    continue;
                }
                te = te.slice(0, result[i][1][j] + textOffset) + '<tsc-error-highlight>' + te.slice(result[i][1][j] + textOffset);
                textOffset += 21;
                var posIndex = result[i][0].indexOf(result[i][1][j]);
                if(posIndex == -1 && result[i][1][j] != 0) {
                    var k = 0;
                    while(k < result[i][0].length && result[i][0][k] < result[i][1][j]) k++;
                    posIndex = k - 1;
                }

                if(posIndex == result[i][1][0].length - 1) {
                    te += '</tsc-error-highlight>';
                }
                else {
                    te = te.slice(0, result[i][0][posIndex + 1] + textOffset) + '</tsc-error-highlight>' + te.slice(result[i][0][posIndex + 1] + textOffset);
                }
                textOffset += 22;
                cur = result[i][0][posIndex + 1];
            }
            if('markup' in text[toFill[i]]) textToUse[toFill[i]] = {text: te, markup: text[toFill[i]]['markup']};
            else textToUse[toFill[i]] = {text: te};

        }
        //if(text.length == 1 && text[0]['text'].length == 0) currentHighlightOverlay.innerHTML = '';
        currentHighlightOverlay.innerHTML = Markup.markupList2html(textToUse);
        previousResult = textToUse;
        previousText = text;
    });
}
var nowTime = 0;
var lastCheckTime = 0;
var shouldCheck = false;

document.addEventListener('keyup', function() {setTimeout(mainEvent, 100);});
document.addEventListener('mousedown', function() {setTimeout(mainEvent, 100);});
function mainEvent() {
    if(nowTime > lastCheckTime) {
        lastCheckTime = nowTime;
        shouldCheck = false;
        recheckPage(checkText);
    }
    else {
        shouldCheck = true;
    }
};
var interval1sec = setInterval(function() {
    nowTime += 1;
    if(shouldCheck) {
        lastCheckTime = nowTime;
        shouldCheck = false;
        recheckPage(checkText);
    }
    if(!currentHighlightOverlay) return;
    if(currentHighlightOverlay.scrollTop != currentActiveElement.scrollTop ||
        currentHighlightOverlay.scrollLeft != currentActiveElement.scrollLeft) {
        doScroll();
    }
    if(currentHighlightOverlay.offsetWidth != currentActiveElement.offsetWidth ||
        currentHighlightOverlay.offsetHeight != currentActiveElement.offsetHeight ||
        currentHighlightOverlay.offsetLeft != currentActiveElement.offsetLeft ||
        currentHighlightOverlay.offsetTop != currentActiveElement.offsetTop) {
        doSize();
    }

}, 1000);

var interval3600sec = setInterval(function() {
    nowTime = 0;
    lastCheckTime = 0;
}, 3600000);

//console.log("content script loaded");
