var findBreaks;
var breaker;
Module['onRuntimeInitialized'] = function() {
    findBreaks = Module.cwrap('th_brk_wc_find_breaks', 'number', ['number', 'number', 'number', 'number', 'number', 'number']);//[ThBrk *brk, const thchar_t *s, int pos[], size_t pos_sz, int inc[], int *inc_ret]
    breaker = Module.ccall('th_brk_new', 'number', ['string'], [null]);
}
function predictCuts(text) {
     var l = text.length;
     if(l == 0) return [[],[]];
     var utfText = Module._malloc((l + 1) * 2);
     Module.stringToUTF16(text, utfText, (l + 1) * 2);
     var pos = Module._malloc((l + 1) * 4);
     var inc = Module._malloc((l + 1) * 4);
     var incRet = Module._malloc(4);
     var res = findBreaks(breaker, utfText, pos, l + 1, inc, incRet);
     Module._free(utfText);
     var incCount = Module.getValue(incRet, 'i32');
     var posArray = Array(res);
     var incArray = Array(incCount);
     for(var i=0; i<res; i++) {
         posArray[i] = Module.getValue(pos + i*4, 'i32');
     }
     for(var i=0; i<incCount; i++) {
         incArray[i] = Module.getValue(inc + i*4, 'i32');
     }
     Module._free(pos);

     Module._free(inc);
     Module._free(incRet);
     return [posArray, incArray];
}
var checkTextLocked = false;
var previousText = [];
var previousResult = [];
const containsThaiRegex = /[ก-๛]/;

function checkText(text) {
    if(checkTextLocked) {
        return;
    }
    checkTextLocked = true;
    try {
        var textToPredict = [];
        var textToUse = Array(text.length);
        var toFill = [];
        var predictResults = [];
        for(var i=0; i<text.length; i++) {
            if(previousText[i] && 'text' in text[i] && 'text' in previousText[i] && previousText[i]['text'] === text[i]['text']) {
                    if('markup' in text[i]) textToUse[i] = {text: previousResult[i]['text'], markup: text[i]['markup']};
                    else textToUse[i] = {text: previousResult[i]['text']};
            }
            else {
                if('text' in text[i] && containsThaiRegex.test(text[i]['text'])) {
                    textToPredict.push(escapeHtml(text[i]['text']));
                    predictResults.push(predictCuts(escapeHtml(text[i]['text'])));
                    toFill.push(i);
                }
                else {
                    if('text' in text[i] && 'markup' in text[i]) textToUse[i] = {text: escapeHtml(text[i]['text']), markup: text[i]['markup']};
                    else if('text' in text[i]) textToUse[i] = {text: escapeHtml(text[i]['text'])};
                    else textToUse[i] = {markup: text[i]['markup']};
                }
            }
        }
        for(var i=0; i<predictResults.length; i++) {
            var te = textToPredict[i];
            var textOffset = 0;
            var cur = 0;
            for(var j=0; j<predictResults[i][1].length; j++) {
                if(predictResults[i][1][j] < cur) {
                    console.warn("Unexpected response");
                    continue;
                }
                te = te.slice(0, predictResults[i][1][j] + textOffset) + '<tsc-error-highlight>' + te.slice(predictResults[i][1][j] + textOffset);
                textOffset += 21;
                var posIndex = predictResults[i][0].indexOf(predictResults[i][1][j]);
                if(posIndex == -1 && predictResults[i][1][j] != 0) {
                    var k = 0;
                    while(k < predictResults[i][0].length && predictResults[i][0][k] < predictResults[i][1][j]) k++;
                    posIndex = k - 1;
                }
                if(posIndex >= predictResults[i][0].length - 1) {
                    te = te + '</tsc-error-highlight>';
                }
                else {
                    te = te.slice(0, predictResults[i][0][posIndex + 1] + textOffset) + '</tsc-error-highlight>' + te.slice(predictResults[i][0][posIndex + 1] + textOffset);
                }
                textOffset += 22;
                cur = predictResults[i][0][posIndex + 1];
            }
            if('markup' in text[toFill[i]]) textToUse[toFill[i]] = {text: te, markup: text[toFill[i]]['markup']};
            else textToUse[toFill[i]] = {text: te};
        }
        if(text.length == 1 && text[0]['text'].length == 0) backdrop.innerHTML = '';
        else backdrop.innerHTML = Markup.markupList2html(textToUse);
        previousResult = textToUse;
        previousText = text;
    }
    catch {
        checkTextLocked = false;
    }
    checkTextLocked = false;
}

function getMarkupListOfActiveElement() {
    return Markup.html2markupList(mainInput.innerHTML, document);
}

function doCheck() {
    checkButton.disabled = true;
    fadeStatusText('กำลังตรวจ');
    revertLock++;
    blink();
    checkText(getMarkupListOfActiveElement());
    fadeStatusText('ตรวจเรียบร้อย');
    checkButton.disabled = false;
    setTimeout(revertStatusText, 1000);
}
function doScroll() {
    if(backdrop.scrollTop != mainInput.scrollTop) backdrop.scrollTop = mainInput.scrollTop;
    if(backdrop.scrollLeft != mainInput.scrollLeft) backdrop.scrollLeft = mainInput.scrollLeft;
}
var mainInput;
var backdrop;
var autocheckCheckbox;
var checkButton;
var statusText;
window.onload = function() {
    mainInput = document.getElementById('main_input');
    backdrop = document.getElementById('backdrop');
    autocheckCheckbox = document.getElementById('autocheck_checkbox');
    checkButton = document.getElementById('check_button');
    statusText = document.getElementById('status_text');
    mainInput.focus();
    autocheckToggle();
    mainInput.addEventListener('scroll', doScroll);
    mainInput.addEventListener('keyup', doScroll);
    //mainInput.addEventListener('resize', doSize);
}
var keyupListener;
function autocheckToggle() {
    if(autocheckCheckbox.checked) {
        checkButton.classList.add('no_use');
        mainInput.addEventListener('keyup', doCheck);
        doCheck();

    }
    else {
        checkButton.classList.remove('no_use');
        mainInput.removeEventListener('keyup', doCheck);
    }
}

var revertLock = 0;
var upcomingStatusText = '';
function revertStatusText() {
    revertLock--;
    if(revertLock <= 0) {
        fadeStatusText('พร้อมตรวจสอบ');
    }
}
var fadeLock = 0;
function fadeStatusText(newText) {
    if(newText == upcomingStatusText) return;
    upcomingStatusText = newText;
    if(fadeLock == 0) {
        fadeLock++;
        //statusText.style.opacity = '0';
        blink();
        setTimeout(function() {
            statusText.innerHTML = upcomingStatusText;
            fadeLock--;
            //statusText.style.opacity = '1';
        }, 200);
    }
}
function blink() {
    statusText.classList.remove('flash');
    void statusText.offsetWidth;
    statusText.classList.add('flash');
}
