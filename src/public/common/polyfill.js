import 'core-js/stable';
import 'regenerator-runtime/runtime';

require('console-polyfill');

require('isomorphic-fetch');

function noop() {

}

if (process.env.BROWSER) {
    if (typeof window !== 'undefined') {
        // requires window, don't do this in webworker
        require('custom-event-polyfill');
    }

    if (typeof Element !== 'undefined') {
        // Later: check if these are supported by core-js.
        Element.prototype.remove = function() {
            this.parentElement.removeChild(this);
        };
        NodeList.prototype.remove = HTMLCollection.prototype.remove = function() {
            for (let i = this.length - 1; i >= 0; i--) {
                if (this[i] && this[i].parentElement) {
                    this[i].parentElement.removeChild(this[i]);
                }
            }
        };
    }
}

global.URLSearchParams = require('url-search-params');

function assertExists(name) {
    if (!(name in global)) {
        throw new Error(`${name} does not exist`);
    }
}

assertExists('Promise');
assertExists('fetch');
assertExists('URLSearchParams');


if (typeof global.document === 'undefined') {
    // Have to assign to `global`, any other method causes errors.
    global.document = {};
    global.document.addEventListener = noop;
}
if (typeof global.window === 'undefined') {
    global.window = {
        navigator: {
            userAgent: '',
        },
    };
    global.window.DOMParser = require('xmldom').DOMParser;
    global.window.addEventListener = noop;
}

export const document = global.document;
export const window = global.window;