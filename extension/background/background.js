
browser.runtime.onMessage.addListener(handleRequest);

browser.browserAction.onClicked.addListener(handleBrowserAction);
var extensionEnabled = true;
browser.browserAction.setBadgeBackgroundColor({color: 'black'});
browser.browserAction.setBadgeText({text: 'On'});
browser.browserAction.setBadgeTextColor({color: 'green'});
browser.browserAction.setTitle({title: 'Thai Spellchecker: On\nClick to turn off.'});

function onError(error) {
    console.warn("Error: ");
    console.warn(error);
}
function sendMessageToTabs(tabs, action) {
    for (let tab of tabs) {
        browser.tabs.sendMessage(tab.id, {action: action}).then(function(r) {
            if(r != 1 && r != 2) {
                console.warn("Toggling spellcheck produces unexpected result: " + r);
            }
        }).catch(function(error) {
            console.warn("Error with tab id: " + tab.id + "\nurl: " + tab.url + "\nactive: " + tab.active);
            onError(error);
        });
    }
}
function handleBrowserAction() {
    extensionEnabled = !extensionEnabled;
    browser.tabs.query({
        discarded: false
    }).then(function(result) {
        if(extensionEnabled) sendMessageToTabs(result, 'turnCheckOn');
        else sendMessageToTabs(result, 'turnCheckOff');
        if(extensionEnabled) {
            browser.browserAction.setBadgeText({text: 'On'});
            browser.browserAction.setBadgeTextColor({color: 'green'});
            browser.browserAction.setTitle({title: 'Thai Spellchecker: On\nClick to turn off.'});
            sendMessageToTabs()
        }
        else {
            browser.browserAction.setBadgeText({text: 'Off'});
            browser.browserAction.setBadgeTextColor({color: 'red'});
            browser.browserAction.setTitle({title: 'Thai Spellchecker: Off\nClick to turn on.'});
        }
    }).catch(onError);
}




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


function handleRequest(request, sender, callback) {
    /*if(request.action === "checkText") {
        checkText(request.text, callback);
    }*/
    checkText(request, callback)
}

function checkText(textObj, callback) {
    var ret = Array(textObj.length);
    for(var i=0; i<textObj.length; i++) {
        ret[i] = predictCuts(textObj[i]);
    }
    callback(ret);
}

//console.log("background.js loaded");
