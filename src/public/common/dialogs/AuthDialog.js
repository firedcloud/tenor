import {
    autobind
} from 'core-decorators';

import {
    Component
} from 'inferno'; // eslint-disable-line no-unused-vars

import emitter from 'tiny-emitter/instance';

import {
    CustomComponent,
    InputButton,
    Link
} from '../components';
import {
    iOS
} from '../util/isMobile';
import {
    downloadObjectUrl
} from '../util';
import {
    CONSTANTS
} from '../config';
import {
    createFormState,
    Form,
    Messages,
    MessagesGroup
} from '../form';
import {
    ProgressCircleIndeterminate
} from '../components/ProgressCircle';
import {
    CheckBoxInput
} from '../components/CheckBoxInput';
import {
    GoogleSigninButton
} from '../components/GoogleSigninButton';
import {
    Icon
} from '../components/Icon';
import dialog from '../dialog';
import storageService from '../services/storageService';
import {
    isValidFileType,
    getMimeType
} from '../util/files';

export class AuthDialog extends CustomComponent {
    constructor(props, context) {
        super(props, context);

        this.allowedAvatarFileTypes = ['jpeg', 'png'];
        this.signupForms = ['legacySignupForm', 'googleSignupForm'];
        this.loginForms = ['loginForm', 'loginAssociatedAccountForm'];
        this.otherForms = ['accountLinkingForm', 'signupSplashForm', 'scope-refresh'];
        const forms = this.signupForms.concat(this.loginForms).concat(this.otherForms);

        if (props.prevState) {
            this.state = props.prevState;
        } else {
            if (props.mode === 'account-linking') {
                storageService.setItem('accountLinkingDialogViewed', Date.now());
                this.state = {
                    mode: 'account-linking',
                };
            } else {
                let mode = this.props.mode;
                if (!mode) {
                    mode = props.signupAllowed ? 'signup-splash' : 'login';
                }
                this.state = {
                    mode, // ('signup-splash'|'signup-username-selection'|'login'|'login-associated-account'|'account-linking'|'legacy-signup')
                    username: '',
                    email: '',
                    password: '',
                    tos: false,
                    isDeveloperPage: props.page === 'developer',
                    avatar: {
                        src: null,
                        file: null,
                        width: null,
                        height: null,
                    },
                };
            }

            forms.forEach((formName) => {
                this.state[formName] = createFormState();
            });
        }

        const animations = [
            '/assets/img/auth/animations/molang-abrazo.mp4',
            '/assets/img/auth/animations/invaderzim-dancing.mp4',
            '/assets/img/auth/animations/spongebob-dancing.mp4',
            '/assets/img/auth/animations/humpday-excited.mp4',
        ];
        this.animationSrc = animations[Math.floor(Math.random() * animations.length)];

        if (props.expiredSession) {
            this.state['loginForm'].addAPIErrors({
                error: {
                    '': 'Your session has expired. Please log in.'
                }
            });
        }
    }

    componentDidMount() {
        emitter.on('DialogContainer.startClose', this.onDialogClose);
        this.registerAuthEvent('dialog-mounted');
    }

    componentWillUnmount() {
        emitter.off('DialogContainer.startClose', this.onDialogClose);
        this.registerAuthEvent('dialog-unmounted');
    }
    componentDidUpdate() {}
    @autobind
    onDialogClose(data) {
        if (this.state.preventDialogClose) {
            const gettextSub = this.context.gtService.gettextSub;
            const state = this.state;

            setTimeout(() => {
                dialog.open('confirmation-dialog', {
                    header: gettextSub(`Are you sure you want to cancel?`),
                    message: gettextSub(`Changes you made will not be saved.`),
                    confirmButtonText: gettextSub(`Yes`),
                    denyButtonText: gettextSub(`No`),
                    denyCallback: () => dialog.open('auth-dialog', {
                        prevState: state
                    }),
                });
            }, 0); // NOTE async so that confirmation dialog opens after auth dialog closes, otherwise confirmation dialog will close right away
        }
    }

    @autobind
    handleAuthResponse(formName, loggedinWithGoogle) {
        return (ret) => {
            console.log('handleAuthResponse cb', ret);
            const [body] = ret;
            const isSignup = this.signupForms.includes(formName);
            const legacySignup = formName === 'legacySignupForm';
            const blockRedirect = ['/gif-maker', '/legacysignup'].some((url) => {
                return this.context.router.route.location.pathname.startsWith(url);
            }) || formName === 'scope-refresh';
            console.log('blockRedirect', blockRedirect, formName);
            const avatarUploadPending = formName === 'googleSignupForm' && this.state.avatar.file;
            let avatarUploaded = false;

            if (avatarUploadPending) {
                const userid = body.user.id;
                this.uploadAvatarImage(userid, this.state.avatar.file);
                avatarUploaded = true;
            }

            this.closeDialogIfOpen();

            if (legacySignup) {
                const username = body.user.username;
                this.setState({
                    username: '',
                    email: '',
                    password: '',
                    tos: false,
                });
                dialog.open('confirmation-dialog', {
                    header: this.context.gtService.gettextSub(`New account created: ${username}`),
                    message: this.context.gtService.gettextSub(`Make partner?`),
                    confirmButtonText: this.context.gtService.gettextSub(`OK`),
                    denyButtonText: this.context.gtService.gettextSub(`NO`),
                    confirmCallback: () => {
                        this.context.router.history.push(`/admin/keyboardusers/${username}`);
                    },
                });
            } else {
                const {
                    authService
                } = this.props;

                this.registerAuthEvent('login_completed', {
                    'category': loggedinWithGoogle ? 'google' : 'email',
                    'actions': isSignup ? 'signup' : 'signin',
                    'info': avatarUploaded ? 'avatar' : '',
                });

                const authData = Object.assign({}, body, {
                    googleAuthResponse: this.state.googleAuthResponse,
                    GoogleUser: this.state.GoogleUser,
                    syncV2NotNeeded: false,
                });
                authService.setAuthData(this.context.apiService, authData, isSignup);

                if (!blockRedirect && this.props.getLoggedInURL) {
                    const url = this.props.getLoggedInURL(body);
                    url && this.context.router.history.push(url);
                }
                if (this.props.loggedinCallback) {
                    window.setTimeout(this.props.loggedinCallback, 300);
                }
                if (formName !== 'loginAssociatedAccountForm' && authService.hasLinkedAccount && !authService.hasLinkedAccount()) {
                    authService.showAccountLinkingDialog();
                }
            }
        };
    }

    registerAuthEvent(eventName, params = {}) {
        switch (eventName) {
            case 'dialog-mounted':
                {
                    if (this.state.mode === 'account-linking') {
                        eventName = 'account_link_upsell_shown';
                    } else {
                        eventName = 'signin_began';
                    }
                    break;
                }
            case 'dialog-unmounted':
                {
                    if (this.state.mode === 'account-linking') {
                        return;
                    } else {
                        eventName = 'signin_closed';
                    }
                    break;
                }
        }

        this.context.apiService.registerEvent(eventName, params);
    }

    closeDialogIfOpen() {
        this.state.preventDialogClose = false;
        this.props.dialog && this.props.dialog.close();
    }

    @autobind
    handleAuthError(formName) {
        return ([error, response]) => {
            const emailAlreadyInUse = error.error.email && error.error.email === 'address is associated with another account';
            if (emailAlreadyInUse && formName !== 'legacySignupForm') {
                const email = this.state.GoogleUser.getBasicProfile().getEmail();

                this.registerAuthEvent('signin_google_acct_exists');
                this.setState({
                    mode: 'login-associated-account',
                    username: email,
                    email,
                });
                return;
            }
            if (error.tosacceptancerequired && error.error.login === 'update required') {
                this.state.tosacceptancerequired = true;
                error.error.login = 'Acceptance of our Terms of Service and Privacy Policy is required to continue.';
            }

            this.state[formName].addAPIErrors(error);
            this.triggerUpdate();
        };
    }

    @autobind
    handleGoogleAuthError(formName) {
        return (error, message) => {
            console.error(error);
            this.state[formName].addAPIErrors({
                error: {
                    '': message
                }
            });
            this.triggerUpdate();
        };
    }

    @autobind
    legacySignup(event) {
        event.preventDefault();
        const formName = 'legacySignupForm';
        const form = this.state[formName];

        if (form.valid()) {
            form.submitted = true;

            const data = {
                username: this.state.username.trim(),
                email: this.state.email.trim(),
                password: this.state.password,
                tos: this.state.tos,
                apitos: this.state.tos && this.state.isDeveloperPage,
            };
            this.props.authService.legacySignupApiCall(this.context.apiService, data)
                .then(this.handleAuthResponse(formName, false), this.handleAuthError(formName))
                .then(this.triggerUpdate)
                .catch((error) => console.error('legacy signup error: ', error));
        }
    }

    @autobind
    signUpWithGoogle(event) {
        event.preventDefault();
        const formName = 'googleSignupForm';
        if (this.state[formName].valid()) {
            this.state[formName].submitted = true;

            const gaiaToken = this.state.googleAuthResponse.id_token;
            const data = {
                gaiaToken,
                username: this.state.username.trim(),
                tos: this.state.tos,
                apitos: this.state.tos && this.state.isDeveloperPage,
            };
            this.props.authService.googleSignupApiCall(this.context.apiService, data)
                .then(this.handleAuthResponse(formName, true), this.handleAuthError(formName))
                .then(this.triggerUpdate)
                .catch((error) => console.error('signup error: ', error));
        }
    }

    @autobind
    loginWithUsername(formName) {
        return (event) => {
            event.preventDefault();
            return new Promise((resolve, reject) => {
                if (this.state[formName].valid()) {
                    this.state[formName].submitted = true;
                    const data = {
                        username: this.state.username.trim(),
                        password: this.state.password,
                    };
                    if (this.state.tos) {
                        data.tos = this.state.tos;
                    }
                    this.props.authService.loginApiCall(this.context.apiService, data)
                        .then(this.handleAuthResponse(formName, false), this.handleAuthError(formName))
                        .then(this.triggerUpdate)
                        .then(resolve)
                        .catch((error) => console.error('username login error: ', error));
                }
            });
        };
    }

    @autobind
    loginAssociatedAccountAndLinkToGoogle(event) {
        event.preventDefault();
        const formName = 'loginAssociatedAccountForm';
        this.loginWithUsername(formName)(event).then(() => {
            if (this.props.authService.isLoggedIn()) {
                const gaiaToken = this.state.googleAuthResponse.id_token;
                this.linkTenorToGoogleAccount(gaiaToken, formName);
            }
        });
    }

    @autobind
    handleGoogleAuthSuccess(formName) {
        const gettextSub = this.context.gtService.gettextSub;

        return ({
            googleAuthResponse,
            GoogleUser
        }) => {
            this.state.googleAuthResponse = googleAuthResponse;
            this.state.GoogleUser = GoogleUser;
            const email = GoogleUser.getBasicProfile().getEmail();
            const gaiaToken = googleAuthResponse.id_token;

            if (formName === 'accountLinkingForm') {
                dialog.open('confirmation-dialog', {
                    header: gettextSub(`Link to ${email}?`),
                    message: gettextSub(`If you proceed, your Tenor profile and GIF uploads will be managed by and associated with your Google account.`),
                    confirmButtonText: gettextSub(`Yes`),
                    denyButtonText: gettextSub(`No`),
                    confirmCallback: () => this.linkTenorToGoogleAccount(gaiaToken, formName),
                });
            } else if (formName === 'scope-refresh') {
                this.getGoogleTokenWhenAuthed(gaiaToken, formName);
            } else {
                this.loginWithGoogle(gaiaToken, formName);
            }
        };
    }

    @autobind
    linkTenorToGoogleAccount(gaiaToken, formName) {
        const data = {
            gaiaToken,
            authToken: this.props.authService.getLegacyToken(),
        };

        this.props.authService.googleAccountLinking(this.context.apiService, data)
            .then(this.handleLinkingSuccess(formName), this.handleLinkingError(formName))
            .then(this.triggerUpdate)
            .catch((error) => console.error('account linking error: ', error));
    }

    @autobind
    handleLinkingSuccess(formName) {
        return ([body]) => {
            console.log('handleLinkingSuccess');
            this.registerAuthEvent('account_link_completed', {
                'actions': formName === 'loginAssociatedAccountForm' ? 'email_assoc' : this.props.userSelected ? 'dropdown' : 'popup',
            });
            this.props.authService.updateAuthData({
                hasgaia: true,
                googleAuthResponse: this.state.googleAuthResponse,
                GoogleUser: this.state.GoogleUser,
            });
            this.closeDialogIfOpen();
            dialog.open('popup-dialog', {
                closeDelay: 2500,
                children: ( <
                    div className = "link-success-popup" >
                    <
                    Icon name = 'success-icon' / >
                    <
                    h1 > {
                        `Account Successfully Linked!`
                    } < /h1> <
                    /div>
                ),
            });
        };
    }

    @autobind
    handleLinkingError(formName) {
        return (...args) => {
            console.log('handleLinkingError', args); // eslint-disable-line prefer-rest-params
            const [error] = args[0];
            console.error(error);
            this.state[formName].addAPIErrors(error);
            this.triggerUpdate();

            // NOTE: In the account linking flow, the linking dialog is closed and the user must confirm
            // acceptance of linking in a new dialog. If there is API error response, we need to reopen the
            // account linking dialog so that we can show the user an error message.
            // This is not necessary for linking an associated account because the dialog will already be open.
            if (formName === 'accountLinkingForm') {
                dialog.open('auth-dialog', {
                    prevState: this.state
                });
            }
        };
    }

    loginWithGoogle(gaiaToken, formName) {
        this.props.authService.googleLoginApiCall(this.context.apiService, {
                gaiaToken
            })
            .then(
                this.handleAuthResponse(formName, true),
                this.handleLoginWithGoogleError(formName),
            )
            .then(this.triggerUpdate)
            .catch((error) => console.error('Google login error:', error));
    }

    @autobind
    handleLoginWithGoogleError(formName) {
        return ([error, response]) => {
            // NOTE if logging into Tenor with Google token fails,
            // navigate thru signup flow unless !signupAllowed (eg. admin page)
            if (this.props.signupAllowed) {
                this.registerAuthEvent('signup_username_prompt_shown');
                this.setState({
                    mode: 'signup-username-selection',
                    preventDialogClose: true,
                    username: '',
                });
            } else {
                this.state[formName].addAPIErrors(error);
                this.triggerUpdate();
            }
        };
    }

    getGoogleTokenWhenAuthed(gaiaToken, formName) {
        this.props.authService.googleGetTokenForLegacyAuth(this.context.apiService, {
                gaiaToken
            })
            .then(
                this.handleAuthResponse(formName, true),
                this.handleGetGoogleTokenWhenAuthedError(formName),
            )
            .then(this.triggerUpdate)
            .catch((error) => console.error('Google login error:', error));
    }

    @autobind
    handleGetGoogleTokenWhenAuthedError(formName) {
        return (error) => {
            if (Array.isArray(error)) {
                error = error[0];
            }
            if (!error.error) {
                error = {
                    error: {
                        '': error.message
                    }
                };
            }
            this.state[formName].addAPIErrors(error);
            this.triggerUpdate();
        };
    }

    @autobind
    handleOnInput(event) {
        this.state[event.target.name] = event.target.value;

        const formName = event.target.form.name;
        const form = this.state[formName];
        form.validateInput(event.target);
        this.clearGeneralFormErrors(formName);
        this.triggerUpdate();
    }

    @autobind
    checkBoxHandler(event) {
        this.state[event.target.name] = event.target.checked;

        const formName = event.target.form.name;
        const form = this.state[formName];
        form.validateInput(event.target);
        this.clearGeneralFormErrors(formName);
        this.triggerUpdate();
    }

    @autobind
    handleDownload() {
        this.setState({
            downloadInProgress: true,
            currentDownloadIdx: 1,
            downloadTS: Date.now(),
        });
        this.props.gifMaker.trackEvent({
            eventName: 'editing_download_tap',
            params: {
                'viewindex': this.props.uploadQueue.length,
            },
        });
        this.downloadFiles(this.props.uploadQueue);
    }

    @autobind
    downloadFiles(queue) {
        if (!queue.length) {
            this.setState({
                downloadInProgress: false,
                downloadTS: null,
            });
            return;
        }
        const uploadObject = queue[0];

        const downloadGif = (objectUrl) => {
            return new Promise((resolve, reject) => {
                // NOTE: anchor element 'click' may not fire if there is not a
                // delay since the last 'click'
                const minDelay = 300;
                const initiateDownload = () => {
                    downloadObjectUrl(objectUrl, 'tenor.gif');
                    this.state.downloadTS = Date.now();
                    this.state.currentDownloadIdx = this.state.currentDownloadIdx + 1,
                        this.triggerUpdate();
                    resolve();
                };
                const timeSinceLastDownload = (this.state.downloadTS ? this.state.downloadTS - Date.now() : 0);
                if (timeSinceLastDownload < minDelay) {
                    setTimeout(() => {
                        initiateDownload();
                    }, minDelay - timeSinceLastDownload);
                } else {
                    initiateDownload();
                }
            });
        };

        return uploadObject.getObjectUrl()
            .then(downloadGif)
            .then(() => this.downloadFiles(queue.slice(1)));
    }

    @autobind
    handleOnChange(event) {
        const newState = {};
        newState[event.target.name] = event.target.value;
        this.setState(newState);
        this.state[event.target.form.name].validateInput(event.target);
    }

    renderLegacySignup() {
        const gettextSub = this.context.gtService.gettextSub;
        const formName = 'legacySignupForm';
        const form = this.state[formName];

        return ( <
            div className = "content" >
            <
            Form className = "auth-content legacy-signup"
            name = {
                formName
            }
            onSubmit = {
                this.legacySignup
            } >
            <
            div className = {
                form.touchedInputErrors('username').length ? 'error' : ''
            } >
            <
            label
            for = "signup_username" > {
                gettextSub('Username')
            } < /label> <
            input id = "signup_username"
            type = "text"
            value = {
                this.state.username
            }
            onInput = {
                this.handleOnInput
            }
            onBlur = {
                this.handleOnChange
            }
            name = "username"
            placeholder = {
                gettextSub('Enter username here')
            }
            autocomplete = "username"
            required = {
                true
            }
            /> <
            Messages state = {
                form
            }
            name = "username" / >
            <
            /div>

            <
            div className = {
                form.touchedInputErrors('email').length ? 'error' : ''
            } >
            <
            label
            for = "signup_email" > {
                gettextSub('Email Address')
            } < /label> <
            input id = "signup_email"
            type = "email"
            value = {
                this.state.email
            }
            onInput = {
                this.handleOnInput
            }
            onBlur = {
                this.handleOnChange
            }
            name = "email"
            placeholder = {
                gettextSub('Enter your email')
            }
            autocomplete = "email"
            required = {
                true
            }
            /> <
            Messages state = {
                form
            }
            name = "email" / >
            <
            /div>

            <
            div className = {
                form.touchedInputErrors('password').length ? 'error' : ''
            } >
            <
            label
            for = "signup_password" > {
                gettextSub('Password')
            } < /label> <
            input id = "signup_password"
            type = "text"
            value = {
                this.state.password
            }
            onInput = {
                this.handleOnInput
            }
            onBlur = {
                this.handleOnChange
            }
            name = "password"
            minlength = "6"
            placeholder = {
                gettextSub('Password (Must be at least 6 characters)')
            }
            autocomplete = "new-password"
            required = {
                true
            }
            /> <
            Messages state = {
                form
            }
            name = "password" / >
            <
            /div>

            {
                this.renderTOSCheckboxSelector()
            }

            <
            Messages state = {
                form
            }
            name = "" / >

            <
            InputButton type = "submit"
            value = {
                gettextSub('Sign Up')
            }
            clickLabel = "sign-up"
            disabled = {
                form.submitDisabled() || !this.state.username || !this.state.email || !this.state.password || !this.state.tos
            }
            /> <
            /Form> <
            /div>
        );
    }

    renderTOSLanguage() {
        const gettextSubComponent = this.context.gtService.gettextSubComponent;

        const tos = < Link external = {
            true
        }
        to = '/legal-terms' > Terms of Service < /Link>;
        const privacyPolicy = < Link external = {
            true
        }
        to = '/legal-privacy' > Privacy Policy < /Link>;
        const apiTos = < Link external = {
            true
        }
        to = '/gifapi/documentation#apiterms' > API Terms of Service < /Link>;

        let text;

        if (this.state.mode === 'signup-username-selection' || this.state.mode === 'login' || this.state.mode == 'legacy-signup') {
            if (this.state.isDeveloperPage) {
                text = gettextSubComponent('I agree to Tenor\'s {tos}, {privacyPolicy}, and {apiTos}', {
                    tos,
                    privacyPolicy,
                    apiTos
                });
            } else {
                text = gettextSubComponent('I agree to Tenor\'s {tos} and {privacyPolicy}', {
                    tos,
                    privacyPolicy
                });
            }
        } else if (this.state.mode === 'signup-splash') {
            if (this.state.isDeveloperPage) {
                text = gettextSubComponent('By clicking Sign in with Google, you agree to our {tos}, {privacyPolicy}, and {apiTos}', {
                    tos,
                    privacyPolicy,
                    apiTos
                });
            } else {
                text = gettextSubComponent('By clicking Sign in with Google, you agree to our {tos} and {privacyPolicy}', {
                    tos,
                    privacyPolicy
                });
            }
        }

        return <span className = "tos-info" > {
            text
        } < /span>;
    }

    renderTOSCheckboxSelector() {
        const gettextSub = this.context.gtService.gettextSub;
        return ( <
            div className = "signup-tos-checkbox" >
            <
            CheckBoxInput id = "signup_tos"
            name = "tos"
            checked = {
                this.state.tos
            }
            checkHandler = {
                this.checkBoxHandler
            }
            label = {
                gettextSub('Agree to terms of service')
            }
            boxSize = {
                '24px'
            }
            checkSize = {
                '13px'
            }
            /> {
                this.renderTOSLanguage()
            } <
            /div>

        );
    }

    @autobind
    clearGeneralFormErrors(formName) {
        delete this.state[formName].errors[''];
        this.triggerUpdate();
    }

    renderSignUpSplash() {
        const gettextSub = this.context.gtService.gettextSub;
        const formName = 'signupSplashForm';
        const form = this.state[formName];

        return ( <
            div className = "content signup-splash" >
            <
            div className = "header mobile-only" >
            <
            img src = "/assets/img/tenor-logo-white.svg"
            width = "80"
            height = "22"
            alt = "Tenor"
            itemprop = "logo" / >
            <
            /div>

            <
            div className = "other-content non-mobile-only" >
            <
            h1 > Say more with the perfect GIF. < /h1> <
            img src = "/assets/img/tenor-logo-white.svg"
            width = "80"
            height = "22"
            alt = "Tenor"
            itemprop = "logo" / >
            <
            /div>

            <
            Form className = "auth-content signup-splash" >
            <
            div className = "top" >
            <
            h1 > {
                gettextSub(`Create a Tenor Account`)
            } < /h1> <
            p > {
                gettextSub(`Search, share and upload your own GIFs to your Tenor account and access them anywhere, anytime.`)
            } < /p>

            <
            GoogleSigninButton onClick = {
                () => this.clearGeneralFormErrors(formName)
            }
            successCallback = {
                this.handleGoogleAuthSuccess(formName)
            }
            failureCallback = {
                this.handleGoogleAuthError(formName)
            }
            />

            <
            div className = "login-mode" >
            <
            span > {
                gettextSub(`Already have an account? `)
            } < /span> <
            a id = "legacy-login-button"
            onClick = {
                () => this.setState({
                    mode: 'login'
                })
            } > {
                gettextSub('Sign in')
            } < /a> <
            /div> <
            /div>

            <
            div className = "bottom" >
            <
            div className = "errors-section" >
            <
            MessagesGroup state = {
                form
            }
            /> <
            /div>

            <
            div className = "signup-tos-info" > {
                this.renderTOSLanguage()
            } <
            /div>

            { /* NOTE downloading gifs on iOS not working */ } {
                this.props.forceLogInToUpload && !iOS() &&
                    <
                    div className = "download-button white-button"
                onClick = {
                        this.handleDownload
                    } > {
                        this.state.downloadInProgress ?
                        <
                        div style = {
                            {
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center'
                            }
                        } >
                        <
                        ProgressCircleIndeterminate
                        diameter = {
                            14
                        }
                        strokeWidthRatio = {
                            .15
                        }
                        color = {
                            '#007add'
                        }
                        animationDuration = {
                            1000
                        }
                        /> <
                        span style = {
                            {
                                marginLeft: '5px'
                            }
                        } > {
                            `${gettextSub('PREPARING YOUR GIFS')} (${this.state.currentDownloadIdx}/${this.props.uploadQueue.length})`
                        } < /span> <
                        /div> : <
                        div > {
                            gettextSub('DOWNLOAD YOUR GIFS')
                        } <
                        /div>
                    } <
                    /div>
            } <
            /div> <
            /Form> <
            /div>
        );
    }

    renderSignUpUsernameSelection() {
        const gettextSub = this.context.gtService.gettextSub;
        const formName = 'googleSignupForm';
        const form = this.state[formName];

        return ( <
            div className = "content" >
            <
            div className = "header" >
            <
            img src = "/assets/img/tenor-logo-white.svg"
            width = "80"
            height = "22"
            alt = "Tenor"
            itemprop = "logo" / >
            <
            /div>

            <
            Form className = "auth-content signup-username"
            name = {
                formName
            }
            onSubmit = {
                this.signUpWithGoogle
            } >
            <
            div className = "top" >
            <
            h1 > {
                gettextSub(`Almost done!`)
            } < /h1> <
            p > {
                gettextSub(`Complete your profile`)
            } < /p>

            {
                this.renderAvatarSelector()
            }

            <
            div >
            <
            label className = "hidden"
            for = "signup_username" > {
                gettextSub('Username')
            } < /label> <
            div className = {
                `username-input-wrapper`
            } >
            <
            input id = "signup_username"
            className = {
                form.touchedInputErrors('username').length ? 'error' : ''
            }
            type = "text"
            value = {
                this.state.username
            }
            onInput = {
                this.handleOnInput
            }
            onBlur = {
                this.handleOnChange
            }
            name = "username"
            placeholder = {
                gettextSub('Choose your username')
            }
            autocomplete = "off"
            required = {
                true
            }
            /> <
            div className = {
                `${this.state.username.length ? 'focused' : ''}`
            } > @ < /div> <
            /div> <
            /div> <
            /div>

            <
            div className = "bottom" >
            <
            div className = "errors-section" >
            <
            MessagesGroup state = {
                form
            }
            /> <
            /div>

            {
                this.renderTOSCheckboxSelector()
            }

            <
            InputButton type = "submit"
            value = {
                gettextSub('DONE')
            }
            clickLabel = "sign-up"
            disabled = {
                form.submitDisabled() || !this.state.username || !this.state.googleAuthResponse || !this.state.tos
            }
            /> <
            /div> <
            /Form> <
            /div>
        );
    }

    renderAvatarSelector() {
        const {
            src,
            width,
            height
        } = this.state.avatar;

        let className;
        if (src) {
            if (width < height) {
                className = 'portrait';
            } else if (width > height) {
                className = 'landscape';
            } else {
                className = 'square';
            }
        }

        return ( <
            label
            for = {
                `avatar-selector`
            }
            className = {
                `avatar-selector`
            } >
            <
            input id = {
                `avatar-selector`
            }
            type = "file"
            name = "files"
            onChange = {
                this.updateAvatar
            }
            accept = {
                this.allowedAvatarFileTypes.map(getMimeType).join(', ')
            }
            /> {
                !src &&
                    <
                    div className = "avatar-circle" >
                    <
                    Icon name = "profile-icon-new" / >
                    <
                    /div>
            } {
                src &&
                    <
                    div className = "avatar-circle" >
                    <
                    img src = {
                        src
                    }
                className = {
                    className
                }
                /> <
                /div>
            } <
            div className = "plus-circle" >
            <
            Icon name = 'plus-circle' / >
            <
            /div> <
            /label>
        );
    }

    @autobind
    updateAvatar(event) {
        let files;
        if (event.dataTransfer && event.dataTransfer.files.length) {
            files = event.dataTransfer.files;
        } else {
            files = event.target.files;
        }
        if (files.length) {
            const file = files[0];
            const formName = 'googleSignupForm';
            const form = this.state[formName];

            if (isValidFileType({
                    file
                }, this.allowedAvatarFileTypes)) {
                const src = window.URL.createObjectURL(file);

                const img = new Image();
                img.addEventListener('load', () => {
                    this.state.avatar = {
                        file,
                        src,
                        width: img.width,
                        height: img.height,
                    };
                    this.triggerUpdate();
                });
                img.addEventListener('error', () => {
                    console.error('Avatar image loading error');
                    form.addAPIErrors({
                        error: {
                            '': 'Could not process avatar image.'
                        }
                    });
                    this.state.avatar = {
                        file: null,
                        src: null,
                    };
                    this.triggerUpdate();
                });
                img.src = src;
            } else {
                form.addAPIErrors({
                    error: {
                        '': 'Avatar must be a PNG or JPEG'
                    }
                });
                this.triggerUpdate();
            }
        }
    }

    uploadAvatarImage(userid, file) {
        if (file) {
            return this.context.apiService.setAvatarAndTagline({
                userid,
                avatarImgFile: file,
                tagline: '',
            }).catch((error) => console.error('avatar save error: ', error));
        } else {
            return;
        }
    }

    renderAccountLinking(msg) {
        const gettextSub = this.context.gtService.gettextSub;
        const formName = 'accountLinkingForm';
        const form = this.state[formName];
        msg = msg || gettextSub('Linking enables Google Sign-In, providing you with faster, more secure access to your Tenor account, favorite content, and uploads on all Tenor apps.');

        return ( <
            div className = "content" >
            <
            div className = "header" >
            <
            img src = "/assets/img/tenor-logo-white.svg"
            width = "80"
            height = "22"
            alt = "Tenor"
            itemprop = "logo" / >
            <
            /div>

            <
            Form className = "auth-content account-linking" >
            <
            div className = "top" >
            <
            h1 > {
                gettextSub(`Link Your Google Account`)
            } < /h1> <
            p > {
                msg
            } < /p> <
            /div>

            <
            div className = "bottom" >
            <
            div className = "errors-section" >
            <
            MessagesGroup state = {
                form
            }
            /> <
            /div>

            <
            GoogleSigninButton onClick = {
                () => this.clearGeneralFormErrors(formName)
            }
            successCallback = {
                this.handleGoogleAuthSuccess(formName)
            }
            failureCallback = {
                this.handleGoogleAuthError(formName)
            }
            /> <
            /div> <
            /Form> <
            /div>
        );
    }

    renderAccountLinkingFavoriting() {
        const gettextSub = this.context.gtService.gettextSub;
        return this.renderAccountLinking(gettextSub('To enable favoriting, you must link your Tenor profile to a Google account. Linking is quick, easy, and ensures access to all of Tenor\'s features.'));
    }

    renderScopeRefresh() {
        const gettextSub = this.context.gtService.gettextSub;
        const formName = 'scope-refresh';
        const form = this.state[formName];
        const permissionText = this.props.permissionText || gettextSub('Please grant Tenor permission to access your Google account.');

        return ( <
            div className = "content" >
            <
            div className = "header" >
            <
            img src = "/assets/img/tenor-logo-white.svg"
            width = "80"
            height = "22"
            alt = "Tenor"
            itemprop = "logo" / >
            <
            /div>

            <
            Form className = "auth-content account-linking" >
            <
            div className = "top" >
            <
            h1 > {
                gettextSub(`Grant Tenor Permissions`)
            } < /h1> <
            p > {
                permissionText
            } < /p> <
            /div>

            <
            div className = "bottom" >
            <
            div className = "errors-section" >
            <
            MessagesGroup state = {
                form
            }
            /> <
            /div>

            <
            GoogleSigninButton onClick = {
                () => this.clearGeneralFormErrors(formName)
            }
            successCallback = {
                this.handleGoogleAuthSuccess(formName)
            }
            failureCallback = {
                this.handleGoogleAuthError(formName)
            }
            /> <
            /div> <
            /Form> <
            /div>
        );
    }

    renderLogIn() {
        const gettextSub = this.context.gtService.gettextSub;
        const formName = 'loginForm';
        const form = this.state[formName];
        const googleSigninDisabled = this.context.router.route.location.pathname.startsWith('/admin');

        return ( <
            div className = "content" >

            <
            div className = "header" >
            <
            img src = "/assets/img/tenor-logo-white.svg"
            width = "80"
            height = "22"
            alt = "Tenor"
            itemprop = "logo" / >
            <
            /div> <
            Form className = "auth-content login"
            name = {
                formName
            }
            onSubmit = {
                this.loginWithUsername(formName)
            } >
            <
            div className = "top" >
            <
            h1 > {
                gettextSub(`Welcome back!`)
            } < /h1>

            <
            div className = "google-signin-section" >
            <
            GoogleSigninButton onClick = {
                () => this.clearGeneralFormErrors(formName)
            }
            successCallback = {
                this.handleGoogleAuthSuccess(formName)
            }
            failureCallback = {
                this.handleGoogleAuthError(formName)
            }
            disabled = {
                googleSigninDisabled
            }
            /> <
            div className = "horizontal-rule" >
            <
            hr / >
            <
            div > < span > or < /span></div >
            <
            /div> <
            /div>

            <
            div >
            <
            label className = "hidden"
            for = "login_username" > {
                gettextSub('Username or Email')
            } < /label> <
            input id = "login_username"
            className = {
                form.touchedInputErrors('username').length ? 'error' : ''
            }
            type = "text"
            value = {
                this.state.username
            }
            onInput = {
                this.handleOnInput
            }
            onBlur = {
                this.handleOnChange
            }
            name = "username"
            placeholder = {
                gettextSub('Enter your username or email')
            }
            autocomplete = "off"
            required = {
                true
            }
            /> <
            /div>

            <
            div >
            <
            label className = "hidden"
            for = "login_password" > {
                gettextSub('Password')
            } < /label> <
            input id = "login_password"
            className = {
                form.touchedInputErrors('password').length ? 'error' : ''
            }
            type = "password"
            value = {
                this.state.password
            }
            onInput = {
                this.handleOnInput
            }
            onBlur = {
                this.handleOnChange
            }
            name = "password"
            minlength = "6"
            placeholder = {
                gettextSub('Enter your password')
            }
            autocomplete = "off"
            required = {
                true
            }
            /> <
            /div>

            <
            div className = "forgot-password" >
            <
            Link to = {
                CONSTANTS.FORGOT_PASSWORD_URL
            }
            onClick = {
                this.props.dialog ? this.props.dialog.close : () => {}
            } > {
                gettextSub('Forgot password?')
            } < /Link> <
            /div> <
            /div>

            <
            div className = "bottom" >
            <
            div className = "errors-section" >
            <
            MessagesGroup state = {
                form
            }
            /> <
            /div>

            {
                this.state.tosacceptancerequired && this.renderTOSCheckboxSelector()
            } { /* TODO -- needed any more? is this for when users hadn't selected tos (acquisition) */ }

            <
            InputButton type = "submit"
            value = {
                gettextSub('SIGN IN')
            }
            clickLabel = "log-in"
            disabled = {
                form.submitDisabled() || !this.state.username || !this.state.password
            }
            /> <
            /div> <
            /Form> <
            /div>
        );
    }

    renderLogInAssociatedAccount() {
        const gettextSub = this.context.gtService.gettextSub;
        const formName = 'loginAssociatedAccountForm';
        const form = this.state[formName];

        return ( <
            div className = "content" >

            <
            div className = "header" >
            <
            img src = "/assets/img/tenor-logo-white.svg"
            width = "80"
            height = "22"
            alt = "Tenor"
            itemprop = "logo" / >
            <
            /div> <
            Form className = "auth-content login-associated-account"
            name = {
                formName
            }
            onSubmit = {
                this.loginAssociatedAccountAndLinkToGoogle
            } >
            <
            div className = "top" >
            <
            h1 > {
                gettextSub(`Welcome back`)
            } < /h1> <
            p > {
                gettextSub(`A Tenor profile is already associated with this email address. Enter your Tenor password to link your Google account.`)
            } < /p>

            <
            div className = "email-address" > {
                this.state.email
            } < /div>

            <
            div >
            <
            label className = "hidden"
            for = "login_password" > {
                gettextSub('Password')
            } < /label> <
            input id = "login_password"
            className = {
                form.touchedInputErrors('password').length ? 'error' : ''
            }
            type = "password"
            value = {
                this.state.password
            }
            onInput = {
                this.handleOnInput
            }
            onBlur = {
                this.handleOnChange
            }
            name = "password"
            minlength = "6"
            placeholder = {
                gettextSub('Enter your password')
            }
            autocomplete = "off"
            required = {
                true
            }
            /> <
            /div>

            <
            div className = "forgot-password" >
            <
            Link to = {
                CONSTANTS.FORGOT_PASSWORD_URL
            }
            onClick = {
                this.props.dialog ? this.props.dialog.close : () => {}
            } > {
                gettextSub('Forgot password?')
            } < /Link> <
            /div> <
            /div>

            <
            div className = "bottom" >
            <
            div className = "errors-section" >
            <
            MessagesGroup state = {
                form
            }
            /> <
            /div>

            {
                this.state.tosacceptancerequired && this.renderTOSCheckboxSelector()
            } { /* TODO -- needed any more? is this for when users hadn't selected tos (acquisition) */ }

            <
            InputButton type = "submit"
            value = {
                gettextSub('SIGN IN')
            }
            clickLabel = "log-in"
            disabled = {
                form.submitDisabled() || !this.state.password
            }
            /> <
            /div> <
            /Form> <
            /div>
        );
    }

    render() {
        const videoSrc = this.animationSrc;

        return ( <
            div id = {
                this.props.id
            }
            className = "auth-dialog" >
            <
            video className = "background-animation"
            muted = {
                true
            }
            playsinline = {
                true
            }
            autoplay = {
                true
            }
            ref = {
                (ref) => {
                    return this.video = ref;
                }
            }
            loop = {
                true
            }
            key = {
                videoSrc
            } >
            <
            source src = {
                videoSrc
            }
            type = "video/mp4" / >
            <
            /video> <
            div className = "video-filter" / >

            {
                this.state.mode === 'signup-splash' && this.props.signupAllowed && this.renderSignUpSplash()
            }

            {
                this.state.mode === 'signup-username-selection' && this.props.signupAllowed && this.renderSignUpUsernameSelection()
            }

            {
                this.state.mode === 'login' && this.renderLogIn()
            }

            {
                this.state.mode === 'login-associated-account' && this.renderLogInAssociatedAccount()
            }

            {
                this.state.mode === 'account-linking' && this.renderAccountLinking()
            }

            {
                this.state.mode === 'account-linking-favoriting' && this.renderAccountLinkingFavoriting()
            }

            {
                this.state.mode === 'scope-refresh' && this.renderScopeRefresh()
            }

            {
                this.state.mode === 'legacy-signup' && this.renderLegacySignup()
            }

            <
            /div>
        );
    }
}