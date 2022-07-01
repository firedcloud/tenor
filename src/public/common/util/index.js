import {
    document,
    window
} from '../polyfill';

import LiteURL from 'lite-url';
import serializeJavascript from 'serialize-javascript';

import {
    Component,
    hydrate
} from 'inferno'; // eslint-disable-line no-unused-vars
import {
    Router,
    StaticRouter
} from 'inferno-router';

import {
    createBrowserHistory
} from 'history';

import {
    isMobile,
    iOS
} from './isMobile';
import {
    isSticker
} from './isSticker';
import bigInt from 'big-integer';

import {
    CONSTANTS
} from '../config';


export function ts() {
    return [Date.now() - CONSTANTS.START_TS, 'ms'];
}


export function noop() {}


// At a certain point, should just switch to humanize-plus.

export function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export function capitalizeAll(str) {
    return str.replace(/\w\S*/g, function(word) {
        return capitalize(word);
    });
}

export function escapeQuotes(s) {
    return process.env.BROWSER ? s : s.replace(/"/g, '&quot;');
}

export function intComma(num) {
    num = num.toString();
    const ary = [];
    let start;
    for (let i = num.length, len = 3; i > 0; i -= 3) {
        start = i - 3;
        if (start < 0) {
            len += start;
            start = 0;
        }
        ary.unshift(num.substr(start, len));
    }
    return ary.join(',');
}


export function reflect(promise) {
    return promise.catch(function(error) {
        console.error('catch', error);
        return error;
    });
}

export function isStatic(gif) {
    return gif.flags && gif.flags.includes('static');
}

// NB: static stickers are currently treated the same as regular stickers
export function isStaticSticker(gif) {
    return isStatic(gif) && isSticker(gif);
}

// NB: static images != static stickers
export function isStaticImage(gif) {
    return isStatic(gif) && !isSticker(gif);
}

export function scrollbarVisible() {
    const htmlElement = document.documentElement;
    const scrollHeight = htmlElement.scrollHeight;
    const clientHeight = htmlElement.clientHeight;
    return scrollHeight > clientHeight;
}

export function isV2PostId(id) {
    // NOTE using big-integer npm package since BigInt not supported on iOS
    return id && bigInt(id).greaterOrEquals('250000000');
}

export function getV1PostId(gif) {
    if (gif && gif.legacy_info && gif.legacy_info.post_id) {
        return gif.legacy_info.post_id;
    }
    if (gif && !isV2PostId(gif.id)) {
        return gif.id;
    }
    return null;
}

export function getCanonicalPostId(gif) {
    if (gif) {
        if (gif.itemurl.endsWith(gif.id)) {
            return gif.id;
        }
        const v1ID = getV1PostId(gif);
        if (gif.itemurl.endsWith(v1ID)) {
            return v1ID;
        }
    }
    return null;
}

export function isTouchDevice() {
    return Boolean(process.env.BROWSER && window && navigator) && (
        ('ontouchstart' in window) ||
        (navigator.maxTouchPoints > 0) ||
        (navigator.msMaxTouchPoints > 0)
    );
}

export {
    document,
    window,
    isMobile,
    iOS,
    isSticker
};


export function downloadBlob(blob, filename) {
    const objectUrl = URL.createObjectURL(blob);
    downloadObjectUrl(objectUrl, filename);
}

export function downloadObjectUrl(objectUrl, filename) {
    const a = document.createElement('a');
    a.download = filename;
    a.href = objectUrl;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
}


export function createRequestObj() {
    return {};
}


export function createResponseObj() {
    const obj = {
        reset: function() {
            obj.status = 200;
            obj.headers = {
                'Content-Type': 'text/html; charset=utf-8',
            };
            obj.body = null;
        },
        vary: function(header) {
            obj.headers['Vary'] = obj.headers['Vary'] || [];
            obj.headers['Vary'].push(header);
        },
        surrogateKey: function(...args) {
            let sKeys = obj.headers['Surrogate-Key'] || '';
            if (sKeys.length) {
                sKeys += ' ';
            }
            sKeys += args.join(' ');
            obj.headers['Surrogate-Key'] = sKeys;
        },
        preload: function(url, asType, push) {
            obj.headers['link'] = obj.headers['link'] || [];
            obj.headers['link'].push(`<${url}>; rel=preload; as=${asType}${!push ? '; nopush' : ''}`);
        },
    };
    obj.reset();
    return obj;
}

export function localURL(url, includeSearch) {
    url = new LiteURL(url);
    let s = url.pathname;
    if (includeSearch && url.search) {
        s += url.search;
    }
    return s;
}

export function fullURL(url) {
    return CONSTANTS.BASE_URL + url;
}


export function cleanMultiwordTag(tag) {
    if (tag.includes(' ')) {
        // This tag has already been split on the backend.
        return tag.trim();
    }
    if (tag.includes('-')) {
        // This tag has already been split on the backend.
        return tag.replace(/-/g, ' ').trim();
    }
    if (tag.match(/^[A-Z0-9]+s?$/)) {
        return tag.trim();
    }
    return tag.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').replace(/\s+/g, ' ').trim();
}

export function removeEmptyStrings(ary) {
    const tmpAry = [];
    for (const s of ary) {
        if (s.length) {
            tmpAry.push(s);
        }
    }
    return tmpAry;
}


export function cleanTermsForURL(ary) {
    for (let i = 0; i < ary.length; i++) {
        // dashes are used as seperators, so we should percent encode dashes
        // within a tag.
        // We generally use "@" instead of "%40", which gets encoded by
        // encodeURIComponent despite being URL safe.
        ary[i] = encodeURIComponent(ary[i]).replace(/-/g, '%2d').replace(/%40/, '@').toLowerCase();
    }
    return ary;
}


export function getArticleLDJSON(that, gif) {
    let created = new Date().toISOString();
    let author = 'unknown';
    const title = that.title;
    const keywords = that.keywords;
    const description = that.description;
    const canonicalURL = that.canonicalURL;

    if (gif) {
        created = new Date(gif.created * 1000).toISOString();
        if (gif.user && gif.user.username) {
            author = gif.user.username;
        }
    }

    const data = {
        '@context': 'http://schema.org',
        '@type': 'Article',
        'author': author,
        'creator': author,
        'headline': title,
        'name': title,
        'url': canonicalURL,
        'mainEntityOfPage': canonicalURL,
        'keywords': keywords,
        'dateModified': created,
        'datePublished': created,
        'publisher': {
            '@context': 'http://schema.org',
            '@type': 'Organization',
            'name': 'Tenor',
            'logo': {
                '@type': 'ImageObject',
                'url': fullURL('/assets/img/tenor-app-icon.png'),
            },
            'sameAs': [
                'https://twitter.com/gifkeyboard',
                'https://www.facebook.com/tenorapp/',
                'https://www.linkedin.com/company/tenorinc/',
            ],
        },
    };
    if (gif) {
        data.image = {
            '@context': 'http://schema.org',
            '@type': 'ImageObject',
            'author': author,
            'creator': author,
            'name': title,
            'keywords': keywords,
            'description': description,
            'url': canonicalURL,
            'contentUrl': gif.media[0].gif.url,
            'thumbnailUrl': gif.media[0].gif.preview,
            'embedUrl': that.embedUrl,
            'width': gif.media[0].gif.dims[0],
            'height': gif.media[0].gif.dims[1],
            'dateCreated': created,
            'uploadDate': created,
            'representativeOfPage': true,
        };
        data.video = {
            '@context': 'http://schema.org',
            '@type': 'VideoObject',
            'author': author,
            'creator': author,
            'name': title,
            'keywords': keywords,
            'description': description,
            'url': canonicalURL,
            'contentUrl': gif.media[0].mp4.url,
            'thumbnailUrl': gif.media[0].mp4.preview,
            'embedUrl': that.embedUrl,
            'width': gif.media[0].mp4.dims[0],
            'height': gif.media[0].mp4.dims[1],
            'dateCreated': created,
            'uploadDate': created,
            'duration': `PT0M${Math.ceil(gif.media[0].mp4.duration)}S`,
        };
    }
    return data;
}


export function getRouter(routes, history, context) {
    if (typeof history === 'string') {
        // A URL was passed in
        return <StaticRouter location = {
            history
        }
        context = {
                context
            } > {
                routes
            } <
            /StaticRouter>;
    }

    return ( <
        Router history = {
            history
        } > {
            routes
        } <
        /Router>
    );
}


export function runIfInBrowser(routes) {
    console.log('runIfInBrowser');
    if (process.env.BROWSER && window) {
        const start = function start() {
            console.log('start');
            // load from window vars
            // might be relevant: https://github.com/ReactTraining/react-router/blob/master/docs/guides/ServerRendering.md#async-routes
            const config = {
                PUBLIC: JSON.parse(atob(document.getElementById('data').innerHTML))
            };
            config.locale = 'en';

            const localeDataEl = document.getElementById('locale-data');
            if (localeDataEl) {
                config.locale = localeDataEl.dataset.locale;
                config.localeData = JSON.parse(localeDataEl.innerHTML);
            }

            const root = document.getElementById('root');

            const history = createBrowserHistory();
            history.listen(function() {
                window.scroll(0, 0);
            });

            let firstLocationSet = true;

            function locationSet() {
                if (firstLocationSet) {
                    firstLocationSet = false;
                } else {
                    console.groupEnd();
                }
                console.groupCollapsed(`locationSet: ${history.location.pathname}`);
            }
            history.listen(locationSet);
            locationSet();

            const requestObj = createRequestObj();
            requestObj.hostname = window.location.hostname;
            requestObj.protocol = window.location.protocol.split(':')[0];

            const router = routes(history, config, requestObj, createResponseObj());

            hydrate(router, root);
        };
        if (/comp|inter|loaded/.test(document.readyState)) {
            start();
        } else {
            document.addEventListener('DOMContentLoaded', start);
        }
    }
}

export function setupAnalytics(options) {
    console.log('incoming options', options);
    options = Object.assign({
        ga: true,
        fbq: false,
    }, options);

    // Filter out browser internal errors: https://groups.google.com/a/chromium.org/forum/#!topic/chromium-discuss/7VU0_VvC7mE
    // Message: TypeError: undefined is not an object (evaluating '__gCrWeb.autofill.extractForms') - Line: 1 - Column: 85 - Error object: {"line":1,"column":85,"sourceURL":"https://tenor.com/search/tulla-gifs"} - URL: https://tenor.com/search/tulla-gifs
    // Message: Uncaught ReferenceError: vid_mate_check is not defined - Line: 1 - Column: 1 - Error object: {} - URL:
    // Message: Uncaught ReferenceError: night_mode_disable is not defined - Line: 1 - Column: 1 - Error object: {} - URL:
    // Message: Uncaught ReferenceError: fixedTimeID is not defined - Line: 1 - Column: 4 - Error object: {} - URL:
    // Message: Uncaught ReferenceError: ztePageScrollModule is not defined - Line: 1 - Column: 957 - Error object: {} - URL:
    // Message: Uncaught TypeError: Cannot set property 'tgt' of null - Line: 34384 - Column: 25 - Error object: {} - URL: https://tenor.com/search/slide-gifs
    // Message: Uncaught ReferenceError: diableNightMode is not defined - Line: 1 - Column: 1 - Error object: {} - URL:
    // Message: Uncaught ReferenceError: androidOnPause is not defined - Line: 1 - Column: 2 - Error object: {} - URL:
    // Message: Uncaught SecurityError: Failed to execute 'sendBeacon' on 'Navigator': Refused to send beacon to 'http://gj.track.uc.cn/collect?...' because it violates the document's Content Security Policy.
    const ignoredErrors = [
        '__gCrWeb',
        'vid_mate_check',
        'night_mode_disable',
        'fixedTimeID',
        'ztePageScrollModule',
        'Cannot set property \'tgt\' of null',
        'diableNightMode is not defined',
        'androidOnPause is not defined',
        'gj.track.uc.cn',
    ];

    if (process.env.BROWSER && options.ga) {
        /* eslint-disable */
        (function(i, s, o, g, r, a, m) {
            i['GoogleAnalyticsObject'] = r;
            i[r] = i[r] || function() {
                (i[r].q = i[r].q || []).push(arguments);
            }, i[r].l = 1 * new Date();
            a = s.createElement(o),
                m = s.getElementsByTagName(o)[0];
            a.async = 1;
            a.src = g;
            m.parentNode.insertBefore(a, m);
        })(window, document, 'script', 'https://www.google-analytics.com/analytics.js', 'ga');
        /* eslint-enable */
    } else {
        window.ga = noop;
    }

    window.ga('create', CONSTANTS.GA_ID || 'UA-3371002-34', {
        sampleRate: CONSTANTS.GA_SAMPLE_RATE || 100,
        siteSpeedSampleRate: CONSTANTS.GA_SPEED_SAMPLE_RATE || 10
    });
    window.ga('require', 'linkid');
    window.ga('require', 'displayfeatures');

    if (process.env.BROWSER && options.fbq) {
        console.log('adding fbq');
        /* eslint-disable */
        ! function(f, b, e, v, n, t, s) {
            if (f.fbq) return;
            n = f.fbq = function() {
                n.callMethod ?
                    n.callMethod.apply(n, arguments) : n.queue.push(arguments);
            };
            if (!f._fbq) f._fbq = n;
            n.push = n;
            n.loaded = !0;
            n.version = '2.0';
            n.queue = [];
            t = b.createElement(e);
            t.async = !0;
            t.src = v;
            s = b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t, s);
        }(window,
            document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
        /* eslint-enable */
    } else {
        window.fbq = noop;
    }

    window.fbq('init', CONSTANTS.FB_ID || '1490938941233674');

    window.onerror = function(msg, url, lineNo, columnNo, error, ...args) {
        console.error(msg, url, lineNo, columnNo, error, ...args);
        if (msg) {
            for (const ignoredError of ignoredErrors) {
                if (msg.includes(ignoredError)) {
                    return;
                }
            }
        }

        const message = [
            `Message: ${msg}`,
            `Line: ${lineNo}`,
            `Column: ${columnNo}`,
            `Error object: ${JSON.stringify(error)}`,
            `URL: ${url}`,
        ].join(' - ');
        window.ga('send', 'exception', {
            'exDescription': message,
            'exFatal': false,
        });
    };

    window.addEventListener('beforeinstallprompt', function(e) {
        window.ga('send', 'event', {
            eventCategory: 'Native Banner',
            eventAction: 'beforeinstallprompt',
            eventLabel: e.platforms.join(','),
        });
        e.userChoice.then(function(choiceResult) {
            window.ga('send', 'event', {
                eventCategory: 'Native Banner',
                eventAction: 'beforeinstallprompt-userChoice',
                eventLabel: `${choiceResult.outcome} ${choiceResult.platform}`,
            });
        });
    });

    let windowLoaded = false;
    window.addEventListener('load', function() {
        windowLoaded = true;
        if (window.performance) {
            window.ga('send', {
                hitType: 'timing',
                timingCategory: 'window',
                timingVar: 'HTML TTFB to window.load Event',
                timingValue: window.performance.timing.loadEventStart - window.performance.timing.responseStart,
            });
        }
    });
    if (process.env.BROWSER) {
        [0, 5, 10, 15, 20].forEach((seconds) => {
            window.setTimeout(() => {
                window.ga('send', 'event', {
                    eventCategory: 'Page Speed',
                    eventAction: `${seconds}s passed`,
                    eventLabel: windowLoaded ? 'loaded' : 'not loaded',
                });
            }, seconds * 1000);
        });
    }
}


export function setupAmplio() {
    if (process.env.BROWSER) {
        const newScript = document.createElement('script');
        const scriptEl = document.getElementsByTagName('script')[0];
        scriptEl.parentNode.insertBefore(newScript, scriptEl);
        newScript.async = true;
        const isProd = CONSTANTS.NGINX_HOST === 'tenor.com';
        newScript.src = `https://news.google.com/thank/js/v1/thank${isProd ? '' : '-qual'}.js`;
    }
}


export function safelySerializeJSON(obj) {
    return serializeJavascript(obj, {
        isJSON: true
    });
}


const htmlElement = process.env.BROWSER ? document.body.parentElement : null;

/**
 * Make a best effort to disbale naviagtion gestures and prompt users before
 * navigating away.
 */
export function discouragePageNavigation(message) {
    message = message || 'Are you sure you want to leave this page?';
    /**
     * This isn't always honored by all browsers. It gets fired when a browser
     * *unloads* resources, but not during SPA nav.
     */
    function attemptToPreventPageNavigation(event) {
        event.preventDefault();
        event.returnValue = message;
        return message;
    }

    window.addEventListener('beforeunload', attemptToPreventPageNavigation);
    // NOTE Safari equivalent to 'beforeunload'
    window.addEventListener('pagehide', attemptToPreventPageNavigation);
    // Prevents pull down reload behavior. Doesn't work on Safari or iOS Chrome.
    if (htmlElement) {
        htmlElement.style.overscrollBehavior = 'contain';
    }

    return function unlisten() {
        window.removeEventListener('beforeunload', attemptToPreventPageNavigation);
        window.removeEventListener('pagehide', attemptToPreventPageNavigation);
        if (htmlElement) {
            htmlElement.style.overscrollBehavior = '';
        }
    };
}

/*
 * Returns false if:
 * 1. gif has geo restricitons and we're on the server side.
 * 1. gif has geo restricitons, we're on the client side, but country is unknown.
 * 1. gif has geo restricitons, we're on the client side, but country is incompatible.
 */
export function gifCountryAllowed(gif, context) {
    if (gif && gif.geographic_restriction) {
        if (!process.env.BROWSER) {
            return false;
        }
        if (!context.countryCode) {
            return false;
        }
        const countryMatch = gif.geographic_restriction.countries.includes(context.countryCode);
        if (gif.geographic_restriction.type === 'allow' && !countryMatch) {
            return false;
        }
        if (gif.geographic_restriction.type === 'block' && countryMatch) {
            return false;
        }
    }
    return true;
}

export function promiseSingleton(func) {
    let promise = null;
    return (...args) => {
        if (!promise) {
            promise = func(...args).finally((val) => {
                promise = null;
            });
        }
        return promise;
    };
}