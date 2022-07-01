import emitter from 'tiny-emitter/instance';

import {
    window
} from '../util';
import dialog from '../dialog';
import storageService from './storageService';
import uploadService from './uploadService';
import googleAuthService from './googleAuthService';

let checkGoogleAccessTokenTimeoutRef;
let timedLogoutRef;
let apiService;

const ret = {
    authData: null,
    init: function() {
        const storedAuthData = storageService.getItem('authData');
        console.log('ret.authData!!!!!!!!!!!', ret.authData);
        if (storedAuthData) {
            ret.authData = JSON.parse(storedAuthData);
            emitter.on('googleAuthLoadChange', () => {
                if (window.gapi) {
                    const GoogleAuth = window.gapi.auth2.getAuthInstance();
                    console.log('GoogleAuth', GoogleAuth);
                    if (GoogleAuth) {
                        const GoogleUser = GoogleAuth.currentUser.get();
                        console.log('GoogleUser', GoogleUser);
                        ret.updateAuthData({
                            GoogleUser
                        });
                    }
                }
            });
            console.log('googleAuthService.getClientConfig()', googleAuthService.getClientConfig());
            googleAuthService.load();
            ret.showOptInDialogIfNeeded();
        }
    },
    logout: function({
        msgToUser
    }) {
        const promise = (apiService ? apiService.oldAPI('POST', '/keyboard.unauthorize') : Promise.resolve());
        promise.then(() => {
            ret.setAuthData(apiService, null);
            uploadService.clearAll();
            if (msgToUser) {
                dialog.open('popup-dialog', {
                    closeDelay: 2500,
                    children: ( <
                        div >
                        <
                        h1 > {
                            msgToUser
                        } < /h1> <
                        /div>
                    ),
                });
            }
        });
        window.ga('send', 'event', {
            eventCategory: 'Account',
            eventAction: 'logout',
        });
    },
    storeAuthData: function() {
        const authData = Object.assign({}, ret.authData);
        delete authData.GoogleUser;
        storageService.setItem('authData', JSON.stringify(authData));
    },
    setAuthData: function(apiService, data, signup) {
        ret.authData = data ? data : null;
        if (ret.authData) {
            ret.storeAuthData();

            // We don't unset userId on logout because we can generally
            // assume it's still the same person.
            window.ga('set', 'userId', ret.authData.user.id);
            if (signup) {
                window.ga('send', 'event', {
                    eventCategory: 'Account',
                    eventAction: 'signup',
                });
            } else {
                window.ga('send', 'event', {
                    eventCategory: 'Account',
                    eventAction: 'login',
                });
            }

            ret.showOptInDialogIfNeeded();
            ret.checkGoogleAccessTokenExpiration();
            apiService.fetchFavorites();
            ret.addTimedLogout(apiService);
        } else {
            apiService.clearFavorites();
            storageService.removeItem('authData');
        }
        emitter.emit('authDataSet');
    },
    updateAuthData: function(data) {
        console.log('updateAuthData', ret.authData, data);
        if (!ret.authData) {
            return;
        }
        Object.assign(ret.authData, data);
        ret.checkGoogleAccessTokenExpiration();
        ret.storeAuthData();
        apiService.fetchFavorites();
        emitter.emit('authDataSet');
    },
    setApiService: function(newApiService) {
        apiService = newApiService;
        if (ret.isLoggedIn()) {
            apiService.fetchFavorites();
        }
    },
    setTosAcceptanceRequired: function(tosacceptancerequired) {
        ret.updateAuthData({
            tosacceptancerequired
        });
    },
    addTimedLogout: function() {
        clearTimeout(timedLogoutRef);
        const expires = ret.getExpires();
        if (expires) {
            timedLogoutRef = setTimeout(function() {
                console.log('timed logout!!!!!!!!!!!!!');
                ret.logout({
                    msgToUser: 'Your session has expired, please log in again.'
                });
            }, 1000 * Math.floor(expires - (Date.now() / 1000)));
        }
    },
    isLoggedIn: function() {
        return Boolean(ret.authData);
    },
    hasLinkedAccount() {
        console.log('hasLinkedAccount', JSON.stringify(ret.authData));
        return Boolean(ret.authData && ret.authData.hasgaia === true);
    },
    hasNotAcceptedTOS: function() {
        return Boolean(ret.authData && ret.authData.tosacceptancerequired !== false);
    },
    getExpires: function() {
        return ret.authData ? ret.authData.auth.expires : null;
    },
    getLegacyToken: function() {
        return ret.authData ? ret.authData.auth.token : null;
    },
    getGoogleAuthResponse: function() {
        return ret.authData ? ret.authData.googleAuthResponse : null;
    },
    getGoogleAccessToken: function() {
        const googleAuthResponse = ret.getGoogleAuthResponse();
        return googleAuthResponse ? googleAuthResponse.access_token : null;
    },
    getGaiaToken: function() {
        const googleAuthResponse = ret.getGoogleAuthResponse();
        return googleAuthResponse ? googleAuthResponse.id_token : null;
    },
    getGoogleUser: function() {
        return ret.authData ? ret.authData.GoogleUser : null;
    },
    hasOAuthScope: function(scope) {
        const GoogleUser = ret.getGoogleUser();
        if (GoogleUser && GoogleUser.hasGrantedScopes(scope)) {
            console.log('hasOAuthScope', scope, 'true');
            return true;
        }
        console.log('hasOAuthScope', scope, 'false');
        return false;
    },
    hasTenorOAuthScope: function() {
        return ret.hasOAuthScope(googleAuthService.TENOR_SCOPE);
    },
    shouldSyncV2: function() {
        if (ret.isLoggedIn() && ret.getGoogleAccessToken() && !ret.authData.syncV2NotNeeded && ret.hasTenorOAuthScope()) {
            return true;
        }
        return false;
    },
    getId: function() {
        return ret.authData ? ret.authData.user.id : null;
    },
    getUser: function() {
        return ret.authData ? ret.authData.user : {};
    },
    getUsername: function() {
        return ret.authData ? ret.authData.user.username : null;
    },
    ownsProfile: function(profile) {
        const username = ret.getUsername();
        return username && username.toLowerCase() === profile.toLowerCase();
    },
    userHasFlag: function(flag) {
        return ret.authData && ret.authData.user.flags.indexOf(flag) > -1;
    },
    getUserFlags: function() {
        return ret.authData ? ret.authData.user.flags : [];
    },
    showLoginDialog: function(dialogData = {}) {
        dialog.open('auth-dialog', dialogData);
    },
    showAccountLinkingDialog: function({
        userSelected = false
    } = {}) {
        dialog.open('auth-dialog', {
            mode: 'account-linking',
            userSelected
        });
    },
    showAccountLinkingFavoritingDialog: function({
        userSelected = false
    } = {}) {
        dialog.open('auth-dialog', {
            mode: 'account-linking-favoriting',
            userSelected
        });
    },
    showScopeRefreshDialog: function({
        permissionText,
        loggedinCallback
    }) {
        dialog.open('auth-dialog', {
            mode: 'scope-refresh',
            permissionText,
            loggedinCallback
        });
    },
    showAccountLinkingDialogAfterTimeoutPeriod: function() {
        if (!ret.isLoggedIn() || ret.hasLinkedAccount() || dialog.isOpen()) {
            return;
        }
        const lastViewed = storageService.getItem('accountLinkingDialogViewed');
        let timedOut = true;
        if (lastViewed) {
            const elapsedTime = Date.now() - lastViewed;
            const oneDay = 1000 * 60 * 60 * 24;
            timedOut = elapsedTime > oneDay;
        }

        timedOut && ret.showAccountLinkingDialog();
    },
    checkGoogleAccessTokenExpiration: function() {
        const googleAuthResponse = ret.getGoogleAuthResponse();
        console.log('checkGoogleAccessTokenExpiration', {
            googleAuthResponse,
            GoogleUser: ret.getGoogleUser(),
        });
        console.log('hasTenorOAuthScope', ret.hasTenorOAuthScope());
        if (!googleAuthResponse) {
            return;
        }
        // Refresh if about to expire in 2 minutes or sooner.
        const expired = (googleAuthResponse.expires_at - (2 * 60 * 1000)) < Date.now();
        if (expired) {
            console.log('Google token expired.');
            const GoogleUser = ret.getGoogleUser();
            if (!GoogleUser) {
                console.log('No GoogleUser, logout.');
                ret.logout({
                    msgToUser: 'Google user information is missing and you have been logged out, please log in again.'
                });
            } else {
                GoogleUser.reloadAuthResponse().then((googleAuthResponse) => {
                    console.log('Google token refresh succeeded.');
                    ret.updateAuthData({
                        googleAuthResponse
                    });
                    ret.checkGoogleAccessTokenExpiration();
                }, () => {
                    console.log('Google token refresh failed.');
                    ret.logout({
                        msgToUser: 'We could not refresh your session and you have been logged out, please log in again.'
                    });
                });
            }
        } else {
            // Check 30 seconds from now.
            console.log('Google token not expired, checking again in 30 seconds.');
            // Need to clean up the last ne before rescheduling.
            if (checkGoogleAccessTokenTimeoutRef) {
                window.clearTimeout(checkGoogleAccessTokenTimeoutRef);
            }
            checkGoogleAccessTokenTimeoutRef = window.setTimeout(() => {
                ret.checkGoogleAccessTokenExpiration();
            }, 30 * 1000);
        }
    },
    showOptInDialogIfNeeded: function() {
        if (ret.hasNotAcceptedTOS()) {
            console.warn('has not accepted tos');
            window.setTimeout(() => {
                // this doens't work without a timeout.
                if (!window.location.pathname.startsWith('/legal-')) {
                    ret.showOptInDialog();
                }
            }, 1000);
        }
    },
    showOptInDialog: function() {
        dialog.open('opt-in-dialog');
    },
    acceptTOS: function(apiService) {
        return apiService.oldAPI('POST', '/keyboard.accepttos', {
            tos: true,
        });
    },
    loginApiCall: function(apiService, data) {
        console.log('loginApiCall');
        return apiService.oldAPI('POST', '/keyboard.login', null, {
            username: data.username,
            password: data.password,
            tos: data.tos,
        });
    },
    // Sign IN to Tenor with a linked Google account
    googleLoginApiCall: function(apiService, data) {
        return apiService.oldAPI('POST', '/keyboard.login', null, {
            gaia_token: data.gaiaToken,
        });
    },
    // Sign UP for a Tenor account and link to a Google account
    googleSignupApiCall: function(apiService, data) {
        console.log('googleSignupApiCall');
        const body = {
            username: data.username,
            tos: data.tos,
            gaia_token: data.gaiaToken,
        };
        if (data.apitos) {
            body['apitos'] = true;
        }
        return apiService.oldAPI('POST', '/keyboard.signup', null, body);
    },
    // Link an existing Tenor account to a Google account
    googleAccountLinking: function(apiService, data) {
        console.log('googleAccountLinking');
        const body = {
            gaia_token: data.gaiaToken,
            token: data.authToken,
        };
        return apiService.oldAPI('POST', '/keyboard.gaialink', null, body);
    },
    // Get a token for a linked account that was authed via username/password
    googleGetTokenForLegacyAuth: function(apiService, data) {
        console.log('googleGetTokenForLegacyAuth');
        return apiService.oldAPI('POST', '/keyboard.login', null, {
            gaia_token: data.gaiaToken,
        }).then(([body, response]) => {
            console.log('googleGetTokenForLegacyAuth body', body);
            // We need to verify the same account was authed.
            console.log(ret.isLoggedIn(), body.user.username, ret.getUsername());
            if (ret.isLoggedIn() && body.user.username !== ret.getUsername()) {
                console.log('throwing error');
                throw new Error('Accounts do not match, please try again with the Google Account that matches your username.');
            }
            return Promise.resolve([body, response]);
        });
    },
};

export default ret;