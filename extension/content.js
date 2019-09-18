
browser.runtime.onMessage.addListener(handleRequest);


var checkingEnabled = false;
function handleRequest(request, sender, callback) {
    if (request.action === 'turnCheckOn') {
        turnCheckOn();
        return Promise.resolve(1);
    } else if (request.action === 'turnCheckOff') {
        turnCheckOff();
        return Promise.resolve(2);
    } else {
        console.warn('Unknown action sent to tsc');
    }
}

var currentActiveElement = document.body;
var isActiveElementInput;
var isActiveElementSimpleInput;
var currentHighlightOverlay;


function createHighlightOverlay(elem) {
    if(currentHighlightOverlay && currentHighlightOverlay.parentNode) {
        currentHighlightOverlay.parentNode.removeChild(currentHighlightOverlay);
    }
    var parent = elem.parentNode;
    const styles = window.getComputedStyle(elem);

    if(isSimpleInput(elem)) {
        currentHighlightOverlay = document.createElement('DIV');
        for (const i in Object.values(styles)) {
            var propertyName = styles[i];
            if(propertyName !== 'z-index') {
                var pv = styles.getPropertyValue(propertyName);
                if(pv !== '') {
                    currentHighlightOverlay.style[propertyName] = pv;
                }
            }
        }
        if(elem.tagName !== 'TEXTAREA') {
            currentHighlightOverlay.id = 'tsc-highlight-overlay-ip';
            var pt = styles.getPropertyValue('padding-top');
            if(pt == 'auto' || pt == '') pt = 0;
            else pt = parseFloat(pt.slice(0, -2));
            var pb = styles.getPropertyValue('padding-bottom');
            if(pb == 'auto' || pb == '') pb = 0;
            else pb = parseFloat(pb.slice(0, -2));
            currentHighlightOverlay.style.lineHeight = (currentActiveElement.clientHeight - pt - pb) + 'px';
        }
        else {
            currentHighlightOverlay.id = 'tsc-highlight-overlay-ta';
            var lh = styles.getPropertyValue('line-height');
            if(lh == '' || lh == 'auto') {
                elem.style.lineHeight = 1.5 + '!important';
                currentHighlightOverlay.style.lineHeight = 1.5 + '!important';
            }
            else {
                elem.style.lineHeight = lh;
                currentHighlightOverlay.style.lineHeight = lh;
            }
        }
        elem.classList.add('tsc-highlighted-element-bi');
        currentHighlightOverlay.innerText = elem.value;

        isActiveElementSimpleInput = true;
    }
    else {
        currentHighlightOverlay = elem.cloneNode(true);
        currentHighlightOverlay.id = 'tsc-highlight-overlay-ce';
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
    z = styles.getPropertyValue('zIndex');
    z = parseInt(z);
    if(isNaN(z)) {
        elem.style.zIndex = 0;
        z = 0;
    }
    currentHighlightOverlay.style.zIndex = z + 1;
    parent.insertBefore(currentHighlightOverlay, elem);
    if(!isActiveElementSimpleInput) {
        var hStyles = window.getComputedStyle(currentHighlightOverlay);
        for (const i in Object.values(hStyles)) {
            var propertyName = hStyles[i];
            if(propertyName !== 'z-index') {
                var pv = styles.getPropertyValue(propertyName);
                var hv = hStyles.getPropertyValue(propertyName);
                if(hv !== pv && pv !== '') {
                    currentHighlightOverlay.style[propertyName] = pv;
                }
            }
        }
    }
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
    if(!isActiveElementSimpleInput) {
        return 0;
    }
    var parent = currentActiveElement.parentNode;
    var styles = window.getComputedStyle(currentActiveElement);

    var pt = styles.getPropertyValue('padding-top');
    if(pt == 'auto' || pt == '') pt = 0;
    else pt = parseFloat(pt.slice(0, -2));
    var pb = styles.getPropertyValue('padding-bottom');
    if(pb == 'auto' || pb == '') pb = 0;
    else pb = parseFloat(pb.slice(0, -2));
    var pl = styles.getPropertyValue('padding-left');
    if(pl == 'auto' || pl == '') pl = 0;
    else pl = parseFloat(pl.slice(0, -2));
    var pr = styles.getPropertyValue('padding-right');
    if(pr == 'auto' || pr == '') pr = 0;
    else pr = parseFloat(pr.slice(0, -2));

    var ot = currentActiveElement.offsetTop;
    var ol = currentActiveElement.offsetLeft;
    if(currentHighlightOverlay.offsetParent !== currentActiveElement.offsetParent) {
        var highlightOffsetParentBB = currentHighlightOverlay.offsetParent.getBoundingClientRect();
        var activeOffsetParentBB = currentActiveElement.offsetParent.getBoundingClientRect();
        ot += activeOffsetParentBB.top - highlightOffsetParentBB.top;
        ol += activeOffsetParentBB.left - highlightOffsetParentBB.left;
    }
    if(styles.getPropertyValue('box-sizing') == 'content-box') {
        currentHighlightOverlay.style.top = (ot + pt) + 'px';
        currentHighlightOverlay.style.left = (ol + pl) + 'px';
    }
    else {
        var tbw = parseFloat(styles.getPropertyValue('border-top-width').slice(0, -2));
        var lbw = parseFloat(styles.getPropertyValue('border-left-width').slice(0, -2));
        currentHighlightOverlay.style.top = (ot + tbw + pt) + 'px';
        currentHighlightOverlay.style.left = (ol + lbw + pl) + 'px';
    }
    currentHighlightOverlay.style.height = (currentActiveElement.clientHeight - pt - pb + 4) + 'px';
    currentHighlightOverlay.style.width = (currentActiveElement.clientWidth - pl - pr) + 'px';


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

function getMarkupListOfActiveElement(elem) {
    if (isSimpleInput(elem)) {
        return [{ text: elem.value }];
    } else if (elem.hasAttribute("contenteditable")) {
        return Markup.html2markupList(elem.innerHTML, document);
    } else if (elem.tagName !== "IFRAME") {
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
var gettingStatus = browser.runtime.sendMessage('getStatus');
gettingStatus.catch(function(e) {
    console.warn('tsc background process response error');
});
gettingStatus.then(function(r) {
    if(r === true) turnCheckOn();
});
