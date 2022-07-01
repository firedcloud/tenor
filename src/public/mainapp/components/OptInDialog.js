import {
    autobind
} from 'core-decorators';

import {
    Component
} from 'inferno'; // eslint-disable-line no-unused-vars

import emitter from 'tiny-emitter/instance';

import {
    Icon
} from '../../common/components/Icon';

import authService from '../../common/services/authService';
import {
    CustomComponent,
    Link
} from '../../common/components';

import './OptInDialog.scss';

// TODO Is this dialog still needed?
export class OptInDialog extends CustomComponent {
    constructor(props, context) {
        super(props, context);
        this.state = {
            dialogNum: 1,
            accept: false,
            reject: false,
            decline: false,
            inputDisabled: false,
            errorMessage: '',
        };
        if (process.env.BROWSER) {
            this.registerEvent('tos_splash_screen');
        }
    }
    componentDidMount() {
        emitter.on('DialogContainer.startClose', this.onClose);
    }
    componentWillUnmount() {
        emitter.off('DialogContainer.startClose', this.onClose);
    }
    registerEvent(eventName) {
        this.context.apiService.registerEvent(eventName, {});
    }
    @autobind
    onClose(data) {
        if (data.dialogId === 'opt-in-dialog') {
            this.registerEvent('tos_close');
        }
    }
    @autobind
    checkBoxHandler(event) {
        const gettextSub = this.context.gtService.gettextSub;

        if (this.state.inputDisabled) {
            return;
        }
        this.setState({
            errorMessage: ''
        });
        if (event.target.name === 'accept') {
            this.registerEvent('tos_accept');
            this.setState({
                inputDisabled: true
            });
            authService.acceptTOS(this.context.apiService)
                .then(([body]) => {
                    authService.setTosAcceptanceRequired(false);
                    this.props.dialog.close();
                }, ([error]) => {
                    this.setState({
                        accept: false,
                        inputDisabled: false,
                        errorMessage: gettextSub('There has been an error. Please try again.'),
                    });
                    console.error(error);
                });
        } else if (event.target.name === 'reject') {
            this.registerEvent('tos_reject');
            this.setState({
                dialogNum: 2,
                accept: false,
                reject: false,
                errorMessage: '',
            });
        } else if (event.target.name === 'decline') {
            this.registerEvent('tos_decline');
            if (this.props.timesOpened >= 3) {
                authService.logout(this.context.apiService);
            }
            this.props.dialog.close();
        }
    }
    @autobind
    backArrowHandler() {
        this.registerEvent('tos_back_tap');
        this.setState({
            dialogNum: 1,
            errorMessage: '',
        });
    }

    renderCheckboxes() {
        const gettextSub = this.context.gtService.gettextSub;

        if (this.state.dialogNum === 1) {
            return ( <
                div className = "opt-in-checkboxes" >
                <
                div className = "opt-in-accept" >
                <
                label
                for = "tos_accept" >
                <
                input id = "tos_accept"
                type = "checkbox"
                name = "accept"
                checked = {
                    this.state.accept
                }
                onClick = {
                    this.checkBoxHandler
                }
                /> {
                    gettextSub('I agree to the Terms of Service and Privacy Policy')
                } <
                /label> <
                /div> <
                div className = "opt-in-reject" >
                <
                label
                for = "tos_reject" >
                <
                input id = "tos_reject"
                type = "checkbox"
                name = "reject"
                checked = {
                    this.state.reject
                }
                onClick = {
                    this.checkBoxHandler
                }
                /> {
                    gettextSub('Decline')
                } <
                /label> <
                /div> <
                /div>
            );
        } else {
            return ( <
                div className = "opt-in-checkboxes" >
                <
                div className = "opt-in-accept" >
                <
                label
                for = "tos_accept" >
                <
                input id = "tos_accept"
                type = "checkbox"
                name = "accept"
                checked = {
                    this.state.accept
                }
                onClick = {
                    this.checkBoxHandler
                }
                /> {
                    gettextSub('I agree to the Terms of Service and Privacy Policy')
                } <
                /label> <
                /div> <
                div className = "opt-in-decline" >
                <
                label
                for = "tos_decline" >
                <
                input id = "tos_decline"
                type = "checkbox"
                name = "decline"
                checked = {
                    this.state.decline
                }
                onClick = {
                    this.checkBoxHandler
                }
                /> {
                    gettextSub('Confirmed, delete my Tenor personal account information')
                } <
                /label> <
                /div> <
                /div>

            );
        }
    }

    renderBackArrow() {
        if (this.state.dialogNum === 2) {
            return ( <
                div className = "opt-in-backarrow" >
                <
                a onClick = {
                    this.backArrowHandler
                } >
                <
                Icon name = "chevron-left"
                style = {
                    {
                        color: 'white',
                        fontSize: '15px'
                    }
                }
                /> <
                /a> <
                /div>
            );
        } else {
            return ( <
                div className = "opt-in-backarrow" > < /div>
            );
        }
    }

    renderMessage() {
        const gettextSub = this.context.gtService.gettextSub;

        if (this.state.dialogNum === 1) {
            return ( <
                div className = "opt-in-message" > {
                    gettextSub(`We've updated our Terms of Service and Privacy Policy!`)
                } <
                /div>
            );
        } else {
            return ( <
                div className = "opt-in-message" > {
                    gettextSub(`If you don't accept by March 22, 2018, your account, login, and username will be deleted`)
                } <
                /div>
            );
        }
    }

    render() {
        const gettextSub = this.context.gtService.gettextSub;

        return ( <
            div className = "OptInDialog" > {
                this.renderBackArrow()
            } {
                this.state.errorMessage &&
                    <
                    div className = "opt-in-error" > {
                        this.state.errorMessage
                    } <
                    /div>
            } {
                this.renderMessage()
            } {
                this.renderCheckboxes()
            } <
            div className = "opt-in-link-to-tos" >
            View & nbsp; <
            Link external = {
                true
            }
            to = '/legal-terms'
            onClick = {
                () => {
                    this.registerEvent('tos_linkout_tap');
                }
            } >
            {
                gettextSub('Terms of Service')
            } < /Link> &
            nbsp; and & nbsp; <
            Link external = {
                true
            }
            to = '/legal-privacy'
            onClick = {
                () => {
                    this.registerEvent('tos_linkout_tap');
                }
            } >
            {
                gettextSub('Privacy Policy')
            } < /Link> <
            /div> <
            /div>
        );
    }
}