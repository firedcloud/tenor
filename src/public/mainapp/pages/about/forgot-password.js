import {
    autobind
} from 'core-decorators';

import {
    Component
} from 'inferno'; // eslint-disable-line no-unused-vars

import {
    Page
} from '../../../common/components';
import {
    Metadata
} from '../../../common/metadata';
import {
    window
} from '../../../common/util';

import {
    createFormState,
    Form,
    Messages
} from '../../../common/form';

import './forgot-password.scss';


export class ForgotPasswordPage extends Page {
    pageInit() {
        const gettextSub = this.context.gtService.gettextSub;

        const query = new URLSearchParams(this.context.router.history.location.search);
        const token = query.get('token');
        if (this.previouslyLoaded && token === this.token) {
            return;
        }
        this.previouslyLoaded = true;
        this.token = token;

        this.title = gettextSub('Reset Tenor Password');
        this.keywords = 'forgot,password,reset';

        this.state.submitted = false;
        this.state.requestFinishedMsg = null;

        this.emailForm = createFormState();
        this.passwordForm = createFormState();
    }

    @autobind
    submitEmail(event) {
        const gettextSub = this.context.gtService.gettextSub;

        event.preventDefault();
        this.setState({
            submitted: true
        });
        const that = this;

        this.context.apiService.oldAPI('POST', '/keyboard.sendforgotpassword', {
                login: this.state.login,
            })
            .then(function() {
                that.setState({
                    requestFinishedMsg: gettextSub('Success! Please check your email for further instructions!')
                });

                window.ga('send', 'event', {
                    eventCategory: 'Forgot Password',
                    eventAction: 'reset-requested',
                    eventLabel: 'success',
                });
            }, function() {
                that.setState({
                    requestFinishedMsg: gettextSub('An error occurred, please try again later.')
                });

                window.ga('send', 'event', {
                    eventCategory: 'Forgot Password',
                    eventAction: 'reset-requested',
                    eventLabel: 'error',
                });
            });
    }

    @autobind
    submitPassword(event) {
        const gettextSub = this.context.gtService.gettextSub;

        event.preventDefault();
        this.setState({
            submitted: true
        });
        this.errors = [];
        const that = this;

        this.context.apiService.oldAPI('POST', '/keyboard.resetpasswordxhr', {
                password: this.state.password,
                token: this.token,
            })
            .then(function() {
                that.setState({
                    requestFinishedMsg: gettextSub('Success! Please login with your new password.')
                });
                that.triggerUpdate();

                window.ga('send', 'event', {
                    eventCategory: 'Forgot Password',
                    eventAction: 'reset-password',
                    eventLabel: 'success',
                });
            }, function([body]) {
                if (body.error.login) {
                    that.passwordForm.addAPIErrors({
                        'error': {
                            '': gettextSub('Invalid token.')
                        }
                    });
                } else {
                    that.passwordForm.addAPIErrors(body.error);
                }
                that.triggerUpdate();

                window.ga('send', 'event', {
                    eventCategory: 'Forgot Password',
                    eventAction: 'reset-password',
                    eventLabel: 'error',
                });
            });
    }

    @autobind
    handleOnInput(event) {
        const newState = {};
        newState[event.target.name] = event.target.value;
        this.setState(newState);
        this[event.target.form.name].setTouched(event.target);
    }
    @autobind
    handleOnChange(event) {
        const newState = {};
        newState[event.target.name] = event.target.value;
        this.setState(newState);
        this[event.target.form.name].validateInput(event.target);
    }
    renderPage() {
        const gettextSub = this.context.gtService.gettextSub;

        return ( <
            div className = "forgot-password-page container page" >
            <
            Metadata page = {
                this
            }
            /> <
            h1 > {
                this.title
            } < /h1>

            {
                !this.token && !this.state.requestFinishedMsg && < Form onSubmit = {
                    this.submitEmail
                }
                name = "emailForm" >
                    <
                    label
                for = "id_login" > {
                    gettextSub('Enter email address or username')
                } < /label> <
                input
                id = "id_login"
                type = "text"
                value = {
                    this.state.login
                }
                onInput = {
                    this.handleOnInput
                }
                name = "login"
                placeholder = {
                    gettextSub('Enter email address or username')
                }
                autocomplete = "email"
                required = {
                    true
                }
                /> <
                input className = "button"
                type = "submit"
                value = {
                    gettextSub('Request New Password')
                }
                disabled = {!this.emailForm.valid() || this.state.submitted
                }
                /> <
                /Form>
            }

            {
                this.token && !this.state.requestFinishedMsg && < Form onSubmit = {
                    this.submitPassword
                }
                name = "passwordForm" >
                    <
                    div className = {
                        this.passwordForm.errors.password ? 'error' : ''
                    } >
                    <
                    label
                for = "id_password" > {
                    gettextSub('Enter password')
                } < /label> <
                input
                id = "id_password"
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
                    gettextSub('Enter new password')
                }
                autocomplete = "new-password"
                required = {
                    true
                }
                /> <
                Messages state = {
                    this.passwordForm
                }
                name = "password" / >
                    <
                    /div>

                    <
                    Messages className = "general-errors"
                state = {
                    this.passwordForm
                }
                name = "" / >

                    <
                    input className = "button"
                type = "submit"
                value = {
                    gettextSub('Set New Password')
                }
                disabled = {!this.passwordForm.valid() || this.state.submitted
                }
                /> <
                /Form>
            }

            {
                this.state.requestFinishedMsg && < p > {
                        this.state.requestFinishedMsg
                    } < /p>} <
                    /div>
            );
        }
    }