
browser.runtime.onMessage.addListener(handleRequest);


var checkingEnabled = false;
function handleRequest(request, sender, callback) {
    if (request.action === "turnCheckOn") {
        turnCheckOn();
        callback(1);
    } else if (request.action === 'turnCheckOff') {
        turnCheckOff();
        callback(2);
    } else {
        console.warn('Unknown action sent to tsc');
    }
}

var currentActiveElement = document.body;
var isActiveElementInput;
var isActiveElementSimpleInput;
var currentHighlightOverlay;

var styleElem = document.createElement('style');
styleElem.innerHTML = '\
#tsc-highlight-overlay-bi {\
    position: absolute!important;\
    display: block!important;\
    box-sizing: content-box!important;\
    padding: 0!important;\
    margin: 0!important;\
    visibility: hidden;\
    color: transparent!important;\
    border: none!important;\
    border-block: none!important;\
    border-inline: none!important;\
    background: transparent!important;\
    -webkit-text-fill-color: transparent!important;\
    -webkit-text-stroke: transparent!important;\
    box-shadow: none!important;\
    outline: none!important;\
    pointer-events: none!important;\
    resize: none!important;\
    scrollbar-width: none!important;\
}\
#tsc-highlight-overlay-ce {\
    position: absolute!important;\
    display: block!important;\
    visibility: hidden;\
    color: transparent!important;\
    border: none!important;\
    background: transparent!important;\
    -webkit-text-fill-color: transparent!important;\
    -webkit-text-stroke: transparent!important;\
    box-shadow: none!important;\
    outline: none!important;\
    pointer-events: none!important;\
    resize: none!important;\
    scrollbar-width: none!important;\
}\
#tsc-highlight-overlay-ce *:not(tsc-error-highlight) {\
    color: transparent!important;\
    background: transparent!important;\
    visibility: hidden!important;\
    -webkit-text-fill-color: transparent!important;\
    -webkit-text-stroke: transparent!important;\
    box-shadow: none!important;\
    outline: none!important;\
    border-color: transparent!important;\
    pointer-events: none!important;\
}\
tsc-error-highlight {\
    visibility: visible!important;\
    color: transparent!important;\
    background: transparent!important;\
    -webkit-text-fill-color: transparent!important;\
    -webkit-text-stroke: transparent!important;\
    border-bottom: 2px solid rgba(255,0,0,0.6);\
    pointer-events: none!important;\
}\
.tsc-highlighted-element-ce:before {\
    content: \"\\00a0\";\
    display: block;\
    overflow: hidden;\
    height: 0;\
    width: 0;\
}\
';
document.body.appendChild(styleElem);

function createHighlightOverlay(elem) {
    if(currentHighlightOverlay && currentHighlightOverlay.parentNode) {
        currentHighlightOverlay.parentNode.removeChild(currentHighlightOverlay);
    }
    var parent = elem.parentNode;
    const styles = window.getComputedStyle(elem);
    const fb = styles.getPropertyValue('flex-basis');
    if(fb != '' && fb != 'auto') {
        console.log("flexbox");
        return;
    }
    var cssText;
    if (styles.cssText !== '') {
        currentHighlightOverlay.style.cssText = styles.cssText;
    }
    else {
        cssText = Object.values(styles).reduce(
            (css, propertyName) =>
                `${css}${propertyName}:${styles.getPropertyValue(
                    propertyName
                )};`
            );
    }
    if(isSimpleInput(elem)) {
        currentHighlightOverlay = document.createElement('DIV');
        currentHighlightOverlay.style.cssText = cssText;
        currentHighlightOverlay.id = 'tsc-highlight-overlay-bi';
        elem.classList.add('tsc-highlighted-element-bi');
        currentHighlightOverlay.innerText = elem.value;
        var lh = styles.getPropertyValue('line-height');
        if(lh == '' || lh == 'auto') {
            elem.style.lineHeight = 1.5 + '!important';
            currentHighlightOverlay.style.lineHeight = 1.5 + '!important';
        }
        else {
            elem.style.lineHeight = lh;
            currentHighlightOverlay.style.lineHeight = lh;
        }
        isActiveElementSimpleInput = true;
    }
    else {
        currentHighlightOverlay = elem.cloneNode(true);
        currentHighlightOverlay.id = 'tsc-highlight-overlay-ce';
        currentHighlightOverlay.style.cssText = cssText;
        elem.classList.add('tsc-highlighted-element-ce');
        const ofy = styles.getPropertyValue('overflow-y');
        const ofx = styles.getPropertyValue('overflow-x');
        elem.style.overflowY = ofy;
        elem.style.overflowX = ofx;

        isActiveElementSimpleInput = false;
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
    parent.insertBefore(currentHighlightOverlay, elem);
    elem.addEventListener("scroll", doScroll);
    elem.addEventListener("resize", doSize);
    elem.addEventListener("resize", doScroll);
    elem.addEventListener("blur", mainEvent100);
    elem.addEventListener("input", mainEvent);

    doSize();
    doScroll();

}

async function doSize() {
    if(!currentHighlightOverlay) return 0;
    if(!isActiveElementSimpleInput) return;
    var parent = currentActiveElement.parentNode;
    var styles = window.getComputedStyle(currentActiveElement);

    pt = styles.getPropertyValue('padding-top');
    if(pt == 'auto' || pt == '') pt = 0;
    else pt =parseFloat( pt.slice(0, -2));
    pb = styles.getPropertyValue('padding-bottom');
    if(pb == 'auto' || pb == '') pb = 0;
    else pb = parseFloat(pb.slice(0, -2));
    pl = styles.getPropertyValue('padding-left');
    if(pl == 'auto' || pl == '') pl = 0;
    else pl = parseFloat(pl.slice(0, -2));
    pr = styles.getPropertyValue('padding-right');
    if(pr == 'auto' || pr == '') pr = 0;
    else pr = parseFloat(pr.slice(0, -2));
    currentHighlightOverlay.style.height = currentActiveElement.clientHeight - pt - pb + 3 + 'px';
    currentHighlightOverlay.style.width = currentActiveElement.clientWidth - pl - pr + 'px';

    if(styles.getPropertyValue('box-sizing') == 'content-box') {
        currentHighlightOverlay.style.top = currentActiveElement.offsetTop + pt + 'px';
        currentHighlightOverlay.style.left = currentActiveElement.offsetLeft + pl + 'px';
    }
    else {
        var tbw = parseFloat(styles.getPropertyValue('border-top-width').slice(0, -2));
        var lbw = parseFloat(styles.getPropertyValue('border-left-width').slice(0, -2));
        currentHighlightOverlay.style.top = currentActiveElement.offsetTop + tbw + pt + 'px';
        currentHighlightOverlay.style.left = currentActiveElement.offsetLeft + lbw + pl + 'px';
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
    if(document.activeElement != currentActiveElement || (currentActiveElement && !checkingEnabled)) {
        if(isActiveElementSimpleInput) currentActiveElement.classList.remove('tsc-highlighted-element-bi');
        else currentActiveElement.classList.remove('tsc-highlighted-element-ce');
        currentActiveElement.removeEventListener('scroll', doScroll);
        currentActiveElement.removeEventListener('resize', doSize);
        currentActiveElement.removeEventListener('resize', doScroll);
        currentActiveElement.removeEventListener('blur', mainEvent100);
        currentActiveElement.removeEventListener('input', mainEvent);
        currentActiveElement = document.activeElement;
        if(isInput(currentActiveElement) && checkingEnabled) {
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
    if(isActiveElementInput && checkingEnabled) {
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
var containsThaiRegex = /[ก-๛]/;

function checkText(text) {
    var textToSend = [];
    var textToUse = Array(text.length);
    var toFill = [];
    for(var i=0; i<text.length; i++) {
        if(previousText[i] && 'text' in text[i] && 'text' in previousText[i] && previousText[i]['text'] === text[i]['text']) {
                if('markup' in text[i]) textToUse[i] = {text: previousResult[i]['text'], markup: text[i]['markup']};
                else textToUse[i] = {text: previousResult[i]['text']};
        }
        else {
            if('text' in text[i] && containsThaiRegex.test(text[i]['text'])) {
                textToSend.push(escapeHtml(text[i]['text']));
                toFill.push(i);
            }
            else {
                if('text' in text[i] && 'markup' in text[i]) textToUse[i] = {text: escapeHtml(text[i]['text']), markup: text[i]['markup']};
                else if('text' in text[i]) textToUse[i] = {text: escapeHtml(text[i]['text'])};
                else textToUse[i] = {markup: text[i]['markup']};
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
                if(posIndex >= result[i][0].length - 1) {
                    te = te + '</tsc-error-highlight>';
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
        if(text.length == 1 && text[0]['text'].length == 0) currentHighlightOverlay.innerHTML = '';
        else currentHighlightOverlay.innerHTML = Markup.markupList2html(textToUse);
        previousResult = textToUse;
        previousText = text;
    });
}


var nowTime;
var lastCheckTime;
var shouldCheck = false;
var interval1sec = -1;
var interval3600sec = -1;

function turnCheckOn() {
    if(checkingEnabled) return 0;
    checkingEnabled = true;
    shouldCheck = true;
    nowTime = 0;
    lastCheckTime = -1;
    previousResult = [];
    previousText = [];
    isActiveElementInput = false;
    isActiveElementSimpleInput = false;
    currentActiveElement = document.body;
    document.addEventListener('keyup', mainEvent100);
    document.addEventListener('mousedown', mainEvent100);

    if(interval1sec != -1) {
        clearInterval(interval1sec);
        interval1sec = -1;
    }
    if(interval3600sec != -1) {
        clearInterval(interval3600sec);
        interval3600sec = -1;
    }

    interval1sec = setInterval(function() {
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
        if(isActiveElementSimpleInput) {
            if(currentHighlightOverlay.clientWidth != currentActiveElement.clientWidth ||
                currentHighlightOverlay.clientHeight != currentActiveElement.clientHeight + 2) {
                doSize();
            }
        }

    }, 1000);

    interval3600sec = setInterval(function() {
        nowTime = 0;
        lastCheckTime = 0;
    }, 3600000);
    mainEvent100();

    /* ||
    currentHighlightOverlay.offsetLeft != currentActiveElement.offsetLeft ||
    currentHighlightOverlay.offsetTop != currentActiveElement.offsetTop*/
}
function turnCheckOff() {
    if(!checkingEnabled) return 0;
    checkingEnabled = false;

    document.removeEventListener('keyup', mainEvent100);
    document.removeEventListener('mousedown', mainEvent100);

    if(interval1sec != -1) {
        clearInterval(interval1sec);
        interval1sec = -1;
    }
    if(interval3600sec != -1) {
        clearInterval(interval3600sec);
        interval3600sec = -1;
    }
    nowTime = 0;
    lastCheckTime = 0;
    recheckPage(function(r) {console.warn("Toggling spellcheck produced unexpected result: " + r);});

}


function mainEvent100() {
    setTimeout(mainEvent, 100);
}
function mainEvent() {
    if(!checkingEnabled) {
        console.warn("Spellchecker called while turned off");
        return 0;
    }
    if(nowTime > lastCheckTime) {
        lastCheckTime = nowTime;
        shouldCheck = false;
        recheckPage(checkText);
    }
    else {
        shouldCheck = true;
    }
};
turnCheckOn();
