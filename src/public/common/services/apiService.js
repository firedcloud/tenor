import emitter from 'tiny-emitter/instance';

import httpService from './httpService';
import {
    CONSTANTS
} from '../config';
import {
    getV1PostId,
    isV2PostId,
    isMobile,
    iOS,
    promiseSingleton
} from '../util';
import storageService from './storageService';
import dialog from '../dialog';

function cleanGifListResponse([body, response]) {
    if (body.results && body.results[0] && body.results[0].id) {
        const ary = [];

        for (const gif of body.results) {
            if (!gif.media) {
                // TODO: once all endpoints migrated to v2, switch all code to use
                // media_formats directly.
                gif.media = [gif.media_formats];
                delete gif.media_formats;
            }
            if (gif.media && gif.media[0]) {
                // delete unused attributes to save on memory/page size
                delete gif.sticker;
                delete gif.shares;
                delete gif.content_rating;
                delete gif.composite;
                delete gif.primary_term;
                // we need the gif formats and the full sized mp4/webm formats
                // nanomp4 and tinymp4 are needed for previews
                delete gif.media[0].loopedmp4;
                delete gif.media[0].nanowebm;
                delete gif.media[0].tinywebm;
                ary.push(gif);
            }
        }
        body.results = ary;
    }

    return [body, response];
}

export function getApiService(globals) {
    const gtService = globals.gtService;
    const cacheService = globals.cacheService;
    const authService = globals.authService || {};

    const LIMIT = 50;
    let anonid;

    // TODO: maybe move favoritesCollectionId to auth or favorites code.
    let favoritesCollectionId = null;
    emitter.on('authDataSet', () => {
        favoritesCollectionId = null;
    });

    const baseAPIQuery = {
        platform: 'web',
    };
    const baseV2APIQuery = {};

    if (globals.request.restrictedCountryCode) {
        baseAPIQuery.country = globals.request.restrictedCountryCode;
        baseV2APIQuery.country = globals.request.restrictedCountryCode;
    }

    const baseOldAPIQuery = {
        deviceid: 'web',
    };

    let setupResolve;
    const setupReject = function() {
        console.error('fetching anonid failed.');
        // We need to continue on as normal.
        setupResolve();
    };
    const anonidPromise = new Promise(function(resolve, reject) {
        setupResolve = resolve;
    });
    anonidPromise.then(function() {
        if (anonid) {
            // This log line needed for tests.
            console.info('anonid-set');
            // TODO: Don't include on authenticated calls.
            baseAPIQuery.anonid = anonid;
            baseOldAPIQuery.keyboardid = anonid;
            baseV2APIQuery.keyboardid = anonid;
        }
    }, function() {
        console.error('An error occurred during API setup.');
    });

    baseAPIQuery.key = CONSTANTS.API_KEY;
    baseV2APIQuery.key = CONSTANTS.API_V2_KEY;
    baseV2APIQuery.client_key = CONSTANTS.API_V2_CLIENT_KEY;
    if (gtService.gt.locale) {
        baseAPIQuery.locale = gtService.gt.locale;
        baseV2APIQuery.locale = gtService.gt.locale;
    }
    if (process.env.BROWSER) {
        anonid = storageService.getItem('anonid');
        if (anonid) {
            setupResolve();
        } else {
            httpService.request({
                    method: 'GET',
                    url: `${CONSTANTS.API_URL}/anonid`,
                    params: baseAPIQuery,
                })
                .then(function(response) {
                    response.json().then(function(body) {
                        anonid = body.anonid;
                        storageService.setItem('anonid', anonid);
                        setupResolve();
                    }, setupReject);
                }, setupReject);
        }
    } else {
        setupResolve();
    }

    function retryAfterAuth(f) {
        return (...args) => {
            const p = f(...args);
            return p.catch(([body, response]) => {
                if (response.status === 401 || response.status === 403) {
                    // Prompt for scope refresh
                    // In callback, retry
                    return new Promise((resolve, reject) => {
                        authService.showScopeRefreshDialog({
                            loggedinCallback: () => {
                                f(...args).then(resolve, reject);
                            }
                        });
                    });
                } else {
                    return Promise.reject([body, response]);
                }
            });
        };
    }

    const ret = {
        LIMIT: LIMIT,
        uploadGif: function({
            data,
            progressCB
        }) {
            const path = '/keyboard.uploadgif';
            return ret.uploadXMLHttpRequest({
                data,
                progressCB,
                path
            });
        },
        uploadGifUrl: function({
            data,
            progressCB
        }) {
            const path = '/keyboard.makeriffpost';
            return ret.uploadXMLHttpRequest({
                data,
                progressCB,
                path
            });
        },
        uploadXMLHttpRequest: function({
            data,
            progressCB,
            path
        }) {
            const p = new Promise(function(resolve, reject) {
                anonidPromise.then(function() {
                    const query = Object.assign({}, baseOldAPIQuery);
                    if (authService.isLoggedIn()) {
                        query.token = authService.getLegacyToken();
                    }

                    if (data instanceof FormData) {
                        for (const [key, val] of Object.entries(query)) {
                            data.append(key, val);
                        }
                    } else {
                        reject({
                            error: 'improper datatype'
                        }); // NOTE: only supports FormData
                    }

                    const url = `${CONSTANTS.KEYBOARD_API_URL}${path}`;

                    const requestPromise = new Promise((resolve, reject) => {
                        const xhr = new XMLHttpRequest();
                        xhr.upload.onprogress = progressCB;
                        xhr.onload = () => {
                            resolve(xhr.response);
                        };
                        xhr.onerror = () => {
                            reject({
                                error: 'API error'
                            });
                        };
                        xhr.open('POST', url);
                        xhr.send(data);
                    });

                    requestPromise.then((body) => {
                        if (body.length) {
                            try {
                                body = JSON.parse(body);
                            } catch (err) {
                                body = {
                                    error: `JSON parsing failed: ${err}`
                                };
                                reject(body);
                                return;
                            }
                        }
                        if (body.error) {
                            reject(body);
                        }
                        resolve(body);
                    });
                });
            });
            return p;
        },
        oldAPI: function(method, path, query, data, headers) {
            const p = new Promise(function(resolve, reject) {
                anonidPromise.then(function() {
                    query = Object.assign({}, baseOldAPIQuery, (query || {}));
                    if (authService.isLoggedIn()) {
                        query.token = authService.getLegacyToken();
                    }

                    headers = headers || {};
                    if (data instanceof FormData) {
                        // Need to use browser default content-type, which includes
                        // multipart boundary.
                        delete headers['content-type'];
                        // Backend can't understand URL params and form data together.
                        for (const [key, val] of Object.entries(query)) {
                            data.append(key, val);
                        }
                        query = undefined;
                    } else {
                        headers['content-type'] = 'application/x-www-form-urlencoded';
                    }

                    httpService.request({
                            method: method,
                            url: CONSTANTS.KEYBOARD_API_URL + path,
                            params: query,
                            data: data,
                            headers: headers,
                        })
                        .then(function(response) {
                                console.log('got old res', path, response.status, response);
                                // our API doesn't return the correct HTTP status codes on
                                // error so we need to check "successful" API calls for errors.
                                response.text().then(function(body) {
                                    if (body.length && response.headers.get('content-type').startsWith('application/json')) {
                                        try {
                                            body = JSON.parse(body);
                                        } catch (err) {
                                            body = {
                                                error: `JSON parsing failed:${err}`
                                            };
                                        }
                                        if (body.error) {
                                            if (body.error.login && authService.isLoggedIn()) {
                                                console.log('api logout', JSON.stringify(body.error));
                                                authService.logout(ret);
                                                dialog.open('auth-dialog', {
                                                    expiredSession: true,
                                                    signupAllowed: false,
                                                    mode: 'login'
                                                });
                                            }
                                            reject([body, response]);
                                            return;
                                        }
                                    }
                                    resolve([body, response]);
                                });
                                console.log('called response.text');
                            },
                            reject);
                });
            });
            return p;
        },
        adminAPI: function(method, path, query, data, headers) {
            const p = new Promise(function(resolve, reject) {
                query = query || {};

                headers = headers || {};
                if (authService.isLoggedIn()) {
                    headers['Authorization'] = `Token ${authService.getLegacyToken()}`;
                }

                headers['content-type'] = 'application/json';

                if (data) {
                    data = JSON.stringify(data);
                }

                httpService.request({
                        method: method,
                        url: CONSTANTS.ADMIN_API_URL + path,
                        params: query,
                        data: data,
                        headers: headers,
                        credentials: 'include',
                    })
                    .then(function(response) {
                            response.text().then(function(body) {
                                if (body.length && response.headers.get('content-type').startsWith('application/json')) {
                                    try {
                                        body = JSON.parse(body);
                                    } catch (err) {
                                        body = {
                                            error: `JSON parsing failed: ${err}`
                                        };
                                        reject({
                                            response,
                                            body
                                        });
                                        return;
                                    }
                                }
                                if (response.ok) {
                                    resolve({
                                        response,
                                        body
                                    });
                                } else {
                                    reject({
                                        response,
                                        body
                                    });
                                }
                            });
                        },
                        reject);
            });
            return p;
        },
        partnerAPI: function(method, path, query, data, headers) {
            const p = new Promise(function(resolve, reject) {
                query = query || {};

                headers = headers || {};
                if (authService.isLoggedIn()) {
                    headers['Authorization'] = `Token ${authService.getLegacyToken()}`;
                }

                headers['content-type'] = 'application/json';

                if (data) {
                    data = JSON.stringify(data);
                }

                httpService.request({
                        method: method,
                        url: CONSTANTS.PARTNER_API_URL + path,
                        params: query,
                        data: data,
                        headers: headers,
                        credentials: 'include',
                    })
                    .then(function(response) {
                            response.text().then(function(body) {
                                if (body.length && response.headers.get('content-type').startsWith('application/json')) {
                                    try {
                                        body = JSON.parse(body);
                                    } catch (err) {
                                        body = `JSON parsing failed: ${err}`;
                                        reject({
                                            response,
                                            body
                                        });
                                        return;
                                    }
                                }
                                if (response.ok) {
                                    resolve({
                                        response,
                                        body
                                    });
                                } else {
                                    reject({
                                        response,
                                        body
                                    });
                                }
                            });
                        },
                        reject);
            });
            return p;
        },
        get: function(path, query) {
            const p = new Promise(function(resolve, reject) {
                anonidPromise.then(function() {
                    query = Object.assign({}, baseAPIQuery, (query || {}));

                    // NOTE: For event logging, we must remove the ability to
                    // associate Tenor user identifiers (userid) to anonid. For
                    // "/registerevent" requests, the isUserLoggedIn parameter
                    // maps to userid when a user is logged in or an empty string
                    // if not.
                    if (query.data && path === '/registerevent') {
                        const data = JSON.parse(query.data);
                        data.isUserLoggedIn && delete query.anonid;
                    }

                    httpService.request({
                            method: 'GET',
                            url: CONSTANTS.API_URL + path,
                            params: query,
                        })
                        .then(function(response) {
                                response.text().then(function(body) {
                                    if (body.length && response.headers.get('content-type').startsWith('application/json')) {
                                        try {
                                            body = JSON.parse(body);
                                        } catch (err) {
                                            body = {
                                                error: `JSON parsing failed: ${err}`
                                            };
                                        }

                                        // v1 API doesn't return the correct HTTP status codes on
                                        // error so we need to check "successful" API calls for errors.
                                        if (body.error) {
                                            reject([body, response]);
                                            return;
                                        }
                                    }
                                    if (response.ok) {
                                        resolve([body, response]);
                                    } else {
                                        reject([body, response]);
                                    }
                                });
                            },
                            function(error) {
                                console.error(error);
                                reject([null, error]);
                            });
                });
            });
            return p.then(cleanGifListResponse);
        },
        post: function(path, query, data, headers) {
            const p = new Promise(function(resolve, reject) {
                anonidPromise.then(function() {
                    query = Object.assign({}, baseAPIQuery, (query || {}));
                    if (authService.isLoggedIn()) {
                        query.access_token = authService.getLegacyToken();
                    }

                    headers = headers || {};
                    if (data instanceof FormData) {
                        // Need to use browser default content-type, which includes
                        // multipart boundary.
                        delete headers['content-type'];
                        // Backend can't understand URL params and form data together.
                        for (const [key, val] of Object.entries(query)) {
                            data.append(key, val);
                        }
                        query = undefined;
                    } else {
                        headers['content-type'] = 'application/x-www-form-urlencoded';
                    }

                    httpService.request({
                            method: 'POST',
                            url: CONSTANTS.API_URL + path,
                            params: query,
                            data: data,
                            headers: headers,
                        })
                        .then(function(response) {
                                // our API doesn't return the correct HTTP status codes on
                                // error so we need to check "successful" API calls for errors.
                                response.text().then(function(body) {
                                    if (body.length && response.headers.get('content-type').startsWith('application/json')) {
                                        try {
                                            body = JSON.parse(body);
                                        } catch (err) {
                                            body = `JSON parsing failed: ${err}`;
                                            reject([body, response]);
                                            return;
                                        }
                                        if (body.error) {
                                            reject([body, response]);
                                            return;
                                        }
                                    }
                                    resolve([body, response]);
                                });
                            },
                            reject);
                });
            });
            return p;
        },
        callV2SyncProfile_: promiseSingleton(function() {
            const googleAccessToken = authService.getGoogleAccessToken();
            const legacyToken = authService.getLegacyToken();
            const userId = authService.getId();
            const query = {
                access_token: googleAccessToken,
                v1_user_token: legacyToken,
                v1_user_id: userId,
            };
            return ret.postV2('/sync_profile', query, null, null, true).then(() => {
                authService.updateAuthData({
                    syncV2NotNeeded: true
                });
            }, (err) => {
                console.error('v2/sync_profile err:', err);
                dialog.open('popup-dialog', {
                    closeDelay: 2500,
                    children: ( <
                        div >
                        <
                        h1 > {
                            `An error has occurred. Please try again.`
                        } < /h1> <
                        /div>
                    ),
                });
                throw err;
            });
        }),
        syncV2: function(skipSyncV2) {
            if (!skipSyncV2 && authService.shouldSyncV2 && authService.shouldSyncV2()) {
                return ret.callV2SyncProfile_();
            }
            return Promise.resolve();
        },
        getV2: function(path, query, skipSyncV2) {
            const syncV2Promise = ret.syncV2(skipSyncV2);
            return syncV2Promise.then(() => {
                const p = new Promise(function(resolve, reject) {
                    anonidPromise.then(function() {
                        query = Object.assign({}, baseV2APIQuery, (query || {}));

                        // NOTE: For event logging, we must remove the ability to
                        // associate Tenor user identifiers (userid) to anonid. For
                        // "/registerevent" requests, the isUserLoggedIn parameter
                        // maps to userid when a user is logged in or an empty string
                        // if not.
                        if (query.data && path === '/registerevent') {
                            const data = JSON.parse(query.data);
                            data.isUserLoggedIn && delete query.keyboardid;
                        }

                        httpService.request({
                                method: 'GET',
                                url: CONSTANTS.API_V2_URL + path,
                                params: query,
                            })
                            .then(function(response) {
                                    // our API doesn't return the correct HTTP status codes on
                                    // error so we need to check "successful" API calls for errors.
                                    response.text().then(function(body) {
                                        if (body.length && response.headers.get('content-type').startsWith('application/json')) {
                                            try {
                                                body = JSON.parse(body);
                                            } catch (err) {
                                                body = {
                                                    error: `JSON parsing failed: ${err}`
                                                };
                                            }
                                            if (body.error) {
                                                reject([body, response]);
                                                return;
                                            }
                                        }
                                        if (response.ok) {
                                            resolve([body, response]);
                                        } else {
                                            // NOTE (v2 API): need to ensure proper error handling for future endpoints
                                            // v2 has the correct HTTP status codes on error but returns a different
                                            // error object in the body --> error: {code, status, message, details}
                                            if (body.error && body.error.message) {
                                                body = {
                                                    error: body.error.message
                                                };
                                            }
                                            reject([body, response]);
                                        }
                                    });
                                },
                                function(error) {
                                    console.error(error);
                                    reject([null, error]);
                                });
                    });
                });
                return p.then(cleanGifListResponse);
            });
        },
        postV2: function(path, query, data, headers, skipSyncV2) {
            const syncV2Promise = ret.syncV2(skipSyncV2);
            return syncV2Promise.then(() => {
                const p = new Promise(function(resolve, reject) {
                    anonidPromise.then(function() {
                        query = Object.assign({}, baseV2APIQuery, (query || {}));

                        // NOTE: For event logging, we must remove the ability to
                        // associate Tenor user identifiers (userid) to anonid. For
                        // "/registerevent" requests, the isUserLoggedIn parameter
                        // maps to userid when a user is logged in or an empty string
                        // if not.
                        if (query.data && path === '/registerevent') {
                            const data = JSON.parse(query.data);
                            data.isUserLoggedIn && delete query.keyboardid;
                        }

                        headers = headers || {};
                        if (data instanceof FormData) {
                            // Need to use browser default content-type, which includes
                            // multipart boundary.
                            delete headers['content-type'];
                            // Backend can't understand URL params and form data together.
                            for (const [key, val] of Object.entries(query)) {
                                data.append(key, val);
                            }
                            query = undefined;
                        } else {
                            headers['content-type'] = 'application/x-www-form-urlencoded';
                        }

                        httpService.request({
                                method: 'POST',
                                url: CONSTANTS.API_V2_URL + path,
                                params: query,
                                data: data,
                                headers: headers,
                            })
                            .then(function(response) {
                                    // our API doesn't return the correct HTTP status codes on
                                    // error so we need to check "successful" API calls for errors.
                                    response.text().then(function(body) {
                                        if (body.length && response.headers.get('content-type').startsWith('application/json')) {
                                            try {
                                                body = JSON.parse(body);
                                            } catch (err) {
                                                body = `JSON parsing failed: ${err}`;
                                                reject([body, response]);
                                                return;
                                            }
                                            if (body.error) {
                                                reject([body, response]);
                                                return;
                                            }
                                        }
                                        resolve([body, response]);
                                    });
                                },
                                function(error) {
                                    console.error(error);
                                    reject([null, error]);
                                });
                    });
                });
                return p;
            });
        },
        getGifV1: function(ids, flag) {
            if (!Array.isArray(ids)) {
                ids = [ids];
            }
            if (ids.length === 1) {
                const cachedPromise = cacheService.getGif(ids[0]);

                if (cachedPromise) {
                    return cachedPromise;
                }
            }

            const query = {
                ids: ids.join(','),
            };
            const requestPromise = ret.get('/gifs', query);
            requestPromise.then(function([body, response]) {
                if (ids.length === 1 && flag !== 'fetchingUnprocessed') {
                    cacheService.setGif(ids[0], [body, response]);
                } else {
                    body.results && body.results.forEach((gif) => {
                        cacheService.setGif(gif.id, {
                            results: [gif]
                        }, response);
                    });
                }
            });
            return requestPromise;
        },

        getAutocompleteResults: function(value, type) {
            type = type || 'trending';
            const cachedPromise = cacheService.getAutocompleteResults(value, type);

            if (cachedPromise) {
                return cachedPromise;
            }
            const query = {};
            let path = '/autocomplete';
            let v2 = true;
            if (type === 'partner') {
                path = '/partner_autocomplete';
                query.tag = value;
                v2 = false;
            } else {
                query.type = type;
                query.q = value;
            }
            const requestPromise = v2 ? ret.getV2(path, query) : ret.get(path, query);
            // Need to strip out special characters until we migrate to /v2/upload.
            requestPromise.then(function([body, response]) {
                body.results = body.results.map((term) => {
                    return term.replace(/[^0-9a-zA-Z ]/g, '');
                });
            });
            requestPromise.then(function([body, response]) {
                cacheService.setAutocompleteResults(value, type, body);
            });

            return requestPromise;
        },

        setFavoriteV2_: retryAfterAuth(function(pid, remove) {
            const googleAccessToken = authService.getGoogleAccessToken();

            const endpoint = remove ? '/remove_collection_post' : '/add_collection_post';

            return ret.getV2FavoritesCollectionId_().then((collectionId) => {
                return ret.postV2(endpoint, {
                    pid,
                    access_token: googleAccessToken,
                    collection_id: collectionId,
                });
            });
        }),

        setFavorite: function(data) {
            let {
                pid,
                gif,
                remove
            } = data;
            console.log('setFavorite', pid, gif, remove);
            if (gif) {
                pid = gif.id;
                const copiedPostId = cacheService.getFavoriteCopiedPostId(pid);
                if (remove && copiedPostId) {
                    pid = copiedPostId;
                }
            }

            cacheService.updateFavorites(pid, remove);
            let p;
            return ret.getConfig().then(([config]) => {
                console.log('setting favorite', config);
                if (config.enable_v2_collection) {
                    p = ret.setFavoriteV2_(pid, remove);
                } else {
                    p = ret.oldAPI('GET', '/keyboard.like', {
                        pid: getV1PostId(gif),
                        remove,
                    });
                }
                return p.then((body) => {}, (err) => {
                    /* remove 'like' if API call fails */
                    cacheService.updateFavorites(pid, !remove);
                    emitter.emit('favoriteDataSet');
                    console.error(err);
                });
            });
        },
        clearFavorites: function() {
            cacheService.clearFavorites();
        },
        fetchFavorites: function() {
            // TODO: switch to just using pid list from /v2/collections.
            let callCount = 0;
            const favoritesList = {};

            const cb = ([body]) => {
                callCount += 1;
                const data = body.results;
                data.forEach((result) => {
                    favoritesList[result.id] = result;
                });

                // NOTE (v2 API): when updating to v2/userliked, "next" may be an empty string instead of 0
                if (!data.length || body.next == '0' || body.next == 0 || callCount > 10) {
                    cacheService.setFavorites(favoritesList);
                    emitter.emit('favoriteDataSet');
                    return;
                }
                ret.getUserLikedGifs(body.next).then(cb, (err) => {
                    console.error(err);
                });
            };
            ret.getUserLikedGifs().then(cb, (err) => {
                console.error(err);
            });
        },
        getV2FavoritesCollectionId_: promiseSingleton(retryAfterAuth(function() {
            if (favoritesCollectionId) {
                return Promise.resolve(favoritesCollectionId);
            }
            const googleAccessToken = authService.getGoogleAccessToken();
            const query = {
                access_token: googleAccessToken,
                profile_id: authService.getId(),
            };
            return ret.getV2('/collections', query).then(([body]) => {
                favoritesCollectionId = body.collections[0].collection_id;
                return body.collections[0].collection_id;
            });
        })),
        getV1UserLikedGifs_: function(next) {
            const query = {
                access_token: authService.getLegacyToken(),
            };
            if (next) {
                query.pos = next;
            }
            return ret.get('/userliked', query);
        },
        getV2UserLikedGifs_: retryAfterAuth(function(next) {
            const requestPromise = ret.getV2FavoritesCollectionId_().then((collectionId) => {
                const googleAccessToken = authService.getGoogleAccessToken();
                const query = {
                    access_token: googleAccessToken,
                    collection_id: collectionId,
                };
                if (next) {
                    query.pos = next;
                }
                return ret.getV2('/collection_posts', query);
            });

            return requestPromise;
        }),
        getUserLikedGifs: function(next) {
            return ret.getConfig().then(([config]) => {
                if (config.enable_v2_collection) {
                    return ret.getV2UserLikedGifs_(next);
                } else {
                    return ret.getV1UserLikedGifs_(next);
                }
            });
        },

        registerEventLegacy: function(eventname, data = {}) {
            let query = {
                eventname: eventname,
                appversion: 'web-1.0',
            };
            if (!data.component) {
                data.component = (iOS() ? 'web_mobile_ios' : isMobile() ? 'web_mobile' : 'web_desktop');
            }
            if (!data.isUserLoggedIn) {
                const id = authService.getId && authService.getId();
                data.isUserLoggedIn = id ? id.toString() : '';
            }

            if (data) {
                query.data = JSON.stringify(data);
            }
            let requestPromise = ret.get('/registerevent', query);
            return requestPromise;
        },

        registerEvent: function(eventname, data = {}) {
            const query = {
                eventname: eventname,
                appversion: 'web-1.1',
            };
            if (!data.component) {
                data.component = (iOS() ? 'web_mobile_ios' : isMobile() ? 'web_mobile' : 'web_desktop');
            }
            if (!data.isUserLoggedIn) {
                const id = authService.getId && authService.getId();
                data.isUserLoggedIn = id ? id.toString() : '';
            }

            if (data) {
                if (data.hasOwnProperty('partner_profile')) {
                    query.partner_profile = data.partner_profile;
                    delete data.partner_profile;
                }
                if (data.hasOwnProperty('usertype')) {
                    query.usertype = data.usertype;
                    delete data.usertype;
                }
                query.data = JSON.stringify(data);
            }
            const requestPromise = ret.postV2('/registerevent', query, null, null, true);
            return requestPromise;
        },

        trackSeeAllContentTap: function(mediaType, src) {
            const eventName = 'see_all_content_tap';
            const params = {
                info: mediaType,
                category: src,
            };
            ret.registerEvent(eventName, params);
        },
        registerShare: function(gif) {
            let requestPromise;
            if (isV2PostId(gif.id)) {
                const query = {
                    id: gif.id
                };
                if (gif.source_id) {
                    query.source_id = gif.source_id;
                }
                requestPromise = ret.postV2('/registershare', query, null, null, true);
            } else {
                requestPromise = ret.get('/registershare', gif.source_id ? {
                    source_id: gif.source_id
                } : {
                    id: gif.id
                });
            }
            return requestPromise;
        },

        registerAdAction: function(gif, action) {
            const data = [{
                'source_id': gif.source_id,
                'action': action,
                'timestamp': Date.now() / 1000,
            }];
            const query = {
                data: JSON.stringify(data),
            };
            const requestPromise = ret.post('/registeraction', query);

            return requestPromise;
        },

        registerAdinViewport: function(gif) {
            return ret.registerAdAction(gif, 'view');
        },

        registerAdViewSession: function(gif) {
            return ret.registerAdAction(gif, 'pixel');
        },

        registerAdShare: function(gif) {
            return ret.registerAdAction(gif, 'share');
        },

        registerPixel: function(url) {
            return fetch(url);
        },

        setBanner: retryAfterAuth(function(data) {
            const requestPromise = ret.post('/setbanner', null, data);
            return requestPromise;
        }),

        // NOTE: avatar image and tagline are optional parameters
        setAvatarAndTagline: retryAfterAuth(function({
            userid,
            avatarImgFile,
            tagline
        }) {
            const settingAvatar = !!avatarImgFile;
            const settingTagline = tagline !== undefined;
            let uploadAvatarImage;

            if (settingAvatar) {
                const avatarFormData = new FormData();
                avatarFormData.append('keyboardid', userid);
                avatarFormData.append('image', avatarImgFile, avatarImgFile.name.toLowerCase());
                uploadAvatarImage = ret.oldAPI('POST', '/keyboard.addavatar', null, avatarFormData);
            }

            const requestPromise = (settingAvatar ? uploadAvatarImage : Promise.resolve([]))
                .then(([body]) => {
                    const profileFormData = new FormData();
                    settingAvatar && profileFormData.append('avatarid', body.avatarid);
                    settingTagline && profileFormData.append('tagline', tagline);

                    return ret.oldAPI('POST', '/keyboard.setprofile', null, profileFormData)
                        .then(([body]) => body);
                });

            return requestPromise;
        }),

        apikeyActivate: function(token) {
            const query = {
                keytoken: token,
            };
            const requestPromise = ret.get('/apipartner/activate', query);
            return requestPromise;
        },

        sendActivationEmail: function(token) {
            const query = {
                access_token: token,
            };
            const requestPromise = ret.get('/apipartner/sendactivationemail', query);
            return requestPromise;
        },

        getDevProfile: retryAfterAuth(function(token) {
            const query = {
                access_token: token,
            };
            const requestPromise = ret.get('/apipartner/profile', query);
            return requestPromise;
        }),

        getConfig: promiseSingleton(retryAfterAuth(function() {
            const googleAccessToken = authService.getGoogleAccessToken();
            const query = {};
            // Tenor scope is required for the token to work. Otherwise, call it without any quth.
            if (googleAccessToken && authService.hasTenorOAuthScope()) {
                query.access_token = googleAccessToken;
            }
            console.log('getConfig googleAccessToken', googleAccessToken);
            console.trace();
            return ret.getV2('/config', query).then(([body, response]) => {
                for (const key of Object.keys(body)) {
                    if (body[key] === 'false') {
                        body[key] = false;
                    }
                }
                // TESTING: temporary for testing.
                // if (authService.hasLinkedAccount() && authService.hasTenorOAuthScope()) {
                //     body.enable_v2_collection = true;
                // }
                return [body, response];
            });
        })),
    };
    authService.setApiService && authService.setApiService(ret);
    return ret;
}