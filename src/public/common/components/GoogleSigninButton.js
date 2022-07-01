import {
    autobind
} from 'core-decorators';

import emitter from 'tiny-emitter/instance';

import {
    Component
} from 'inferno'; // eslint-disable-line no-unused-vars
import {
    CustomComponent,
    Button
} from '../components';
import googleAuthService from '../services/googleAuthService';

import './GoogleSigninButton.scss';


export class GoogleSigninButton extends CustomComponent {
    constructor(props, context) {
        super(props, context);
        if (!googleAuthService.scriptLoaded) {
            googleAuthService.load();
        }
        this.handleGoogleAuthLoadChange();
    }
    componentDidMount() {
        emitter.on('googleAuthLoadChange', this.handleGoogleAuthLoadChange);
    }
    componentWillUnmount() {
        emitter.off('googleAuthLoadChange', this.handleGoogleAuthLoadChange);
    }
    @autobind
    handleGoogleAuthLoadChange() {
        // Needed to trigger button rerender.
        this.setState({
            scriptLoaded: googleAuthService.scriptLoaded,
            errorMsg: googleAuthService.errorMsg,
        });
        if (googleAuthService.errorMsg) {
            this.props.failureCallback && this.props.failureCallback(googleAuthService.errorMsg, 'Google authentication failed to initialize');
            // An error was encountered, no need to listen for changes. Also need to avoid potentially calling this callback twice.
            emitter.off('googleAuthLoadChange', this.handleGoogleAuthLoadChange);
        }
    }
    @autobind
    clickHandler(event) {
        event.preventDefault();
        this.signInWithGoogle();
        this.props.onClick && this.props.onClick();
        this.context.apiService.registerEvent('google_authentication_tap', {});
    }

    @autobind
    signInWithGoogle() {
        const GoogleAuth = window.gapi.auth2.getAuthInstance();
        console.log('GoogleAuth', GoogleAuth);
        GoogleAuth.signIn(googleAuthService.getSignInOptions())
            .then(this.handleAuthResponse, this.handleAuthError);
    }

    @autobind
    handleAuthResponse(GoogleUser) {
        console.log('handleAuthResponse GoogleUser', GoogleUser);
        const googleAuthResponse = GoogleUser.getAuthResponse(true);

        this.props.successCallback && this.props.successCallback({
            googleAuthResponse,
            GoogleUser,
        });
    }

    @autobind
    handleAuthError(error) {
        console.log('handleAuthError', error);
        console.error(error);
        this.props.failureCallback && this.props.failureCallback(error, 'Google authentication error');
    }

    render() {
        return ( <
            div className = "GoogleSigninButton" >
            <
            label className = "hidden"
            for = 'google-auth-button' > Sign in with Google < /label> <
            Button name = 'google-auth-button'
            type = 'button'
            clickLabel = 'log-in-google'
            onClick = {
                this.clickHandler
            }
            disabled = {!googleAuthService.scriptLoaded || this.props.disabled
            }
            /> <
            /div>
        );
    }
}