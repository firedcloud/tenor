import cookie from 'cookie';

import {
    document
} from '../util';


let storage;

if (typeof localStorage === 'object') {
    try {
        localStorage.setItem('localStorage', 1);
        localStorage.removeItem('localStorage');
        storage = localStorage;
    } catch (e) {
        console.error('localStorage not working');
    }
} else {
    console.error('localStorage does not exist');
}

if (!storage) {
    let d = {};
    storage = {
        getItem: function(key) {
            return d[key];
        },
        removeItem: function(key) {
            delete d[key];
        },
        setItem: function(key, value) {
            return d[key] = `${value}`;
        },
        clear: function() {
            d = {};
        },
        get length() {
            return Object.keys(d).length;
        },
        key: function(i) {
            const keys = Object.keys(d);
            return keys[i] || null;
        },
    };
}

try {
    // Test Support
    const initCookie = cookie.parse((document && document.cookie) || '').initLocalStorage;
    if (initCookie) {
        for (const [key, val] of Object.entries(JSON.parse(initCookie))) {
            storage.setItem(key, val);
        }
    }
} catch (err) {
    console.error(err);
}

export default storage;