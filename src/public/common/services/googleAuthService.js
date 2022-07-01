import emitter from 'tiny-emitter/instance';

import {
    CONSTANTS
} from '../config';

function loadGoogleAuth() {
    window.gapi.load('auth2', () => {
        console.log('window.gapi.auth2', window.gapi.auth2, ret.getClientConfig());
        window.gapi.auth2.init(ret.getClientConfig())
            .then(() => {
                ret.scriptLoaded = true;
                emitter.emit('googleAuthLoadChange');
            }, (error) => {
                ret.errorMsg = error;
                console.error(ret.errorMsg);
                emitter.emit('googleAuthLoadChange');
            });
    });
}

function loadGoogleAuthScript() {
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = 'https://apis.google.com/js/client:platform.js';
    const scriptEl = document.getElementsByTagName('script')[0];
    scriptEl.parentNode.insertBefore(script, scriptEl);
    script.onload = loadGoogleAuth;
    script.onerror = () => {
        ret.errorMsg = 'Google Auth script failed to load.';
        emitter.emit('googleAuthLoadChange');
    };
}

const ret = {
    TENOR_SCOPE: 'https://www.googleapis.com/auth/tenor',
    scriptLoaded: false,
    errorMsg: null,
    // NOTE params for gapi.auth2.init
    // https://developers.google.com/identity/sign-in/web/reference#gapiauth2clientconfig
    getClientConfig: function() {
        return {
            client_id: CONSTANTS.GOOGLE_SIGNIN_CLIENT_ID,
            scope: `email ${ret.TENOR_SCOPE}`, // TODO profile|email|openid
            fetch_basic_profile: false, // NOTE change to true to allow access to profile image, name, etc
        };
    },
    // NOTE https://developers.google.com/identity/sign-in/web/reference#gapiauth2signinoptions
    getSignInOptions: function() {
        return {
            prompt: 'select_account',
            scope: 'email',
        };
    },
    load: loadGoogleAuthScript,
};

export default ret;