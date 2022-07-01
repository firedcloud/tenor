import {
    ts
} from '../util';


function request(o) {
    // https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
    let url = o.url;
    let params;
    delete o.url;
    o.body = o.data;
    delete o.data;

    const start = Date.now();
    if (o.body && typeof o.body !== 'string' && o.headers['content-type'] == 'application/x-www-form-urlencoded') {
        params = new URLSearchParams();
        for (const [key, val] of Object.entries(o.body)) {
            if (val !== undefined) {
                params.set(key, val);
            }
        }
        // Need toString() for Safari support, which doens't handle our
        // URLSearchParams polyfill ("unsupported BodyInit type" shows in the
        // console).
        o.body = params.toString();
    }
    url = encodeURI(url);
    if (!o.body && o.params) {
        // WARNING: assumes no query already on URL. Done this way because
        // `new URL()` isn't supported in node.
        url += '?';
        params = [];
        for (const [key, val] of Object.entries(o.params)) {
            params.push(`${encodeURIComponent(key)}=${encodeURIComponent(val)}`);
        }
        url += params.join('&');
    }
    // TODO: need to fix headers?
    o.mode = o.mode || 'cors';
    console.log('fetching', url, o);
    console.log('fetchStarted');
    const promise = fetch(url, o);
    promise.then(function(response) {
        console.log(ts(), `fetch-took ${Date.now() - start}ms:`, o.method, url, o.params);
        console.log('fetchFinished');
        return response;
    });
    promise.catch(function(err) {
        console.error('fetchError', err);
    });
    return promise;
}

export default {
    request: request
};