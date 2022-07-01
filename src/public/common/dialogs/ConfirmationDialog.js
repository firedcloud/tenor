import {
    Component
} from 'inferno'; // eslint-disable-line no-unused-vars
import {
    autobind
} from 'core-decorators';
import {
    CustomComponent
} from '../components';
import {
    window
} from '../util';
import {
    KEY
} from '../constants';

import './ConfirmationDialog.scss';

export class ConfirmationDialog extends CustomComponent {
    constructor(props, context) {
        super(props, context);
        const gettextSub = this.context.gtService.gettextSub;
        this.header = props.header || gettextSub('Are you sure you want to proceed?');
        this.message = props.message || gettextSub('Please confirm action');
        this.denyButtonText = props.denyButtonText || gettextSub('CANCEL');
        this.confirmButtonText = props.confirmButtonText || gettextSub('CONFIRM');
    }

    componentDidMount() {
        window.addEventListener('keydown', this.handleOnKeyDown);
    }

    componentWillUnmount() {
        window.removeEventListener('keydown', this.handleOnKeyDown);
    }

    @autobind
    handleOnKeyDown(event) {
        if (event.keyCode === KEY.ENTER) {
            this.confirm();
        }
    }

    @autobind
    deny() {
        window.ga('send', 'event', {
            Category: 'ConfirmationDialog',
            Action: 'deny',
            Label: this.message,
        });
        this.props.dialog.close();
        this.props.denyCallback && this.props.denyCallback();
    }

    @autobind
    confirm() {
        window.ga('send', 'event', {
            Category: 'ConfirmationDialog',
            Action: 'confirm',
            Label: this.message,
        });
        this.props.dialog.close();
        this.props.confirmCallback && this.props.confirmCallback();
    }

    render() {
        const {
            children,
            options
        } = this.props;
        const showDenyButton = !(options && options.hideDenyButton);
        let content;

        if (children) {
            content = children;
        } else {
            content = ( <
                div >
                <
                h2 > {
                    this.header
                } < /h2> <
                p > {
                    this.message
                } < /p> <
                /div>
            );
        }

        return ( <
            div id = "confirmation-dialog" >

            {
                content
            }

            <
            div className = "button-row" > {
                showDenyButton &&
                <
                button
                className = "deny-button"
                onClick = {
                    this.deny
                } >
                {
                    this.denyButtonText
                } <
                /button>
            } <
            button className = "confirm-button"
            onClick = {
                this.confirm
            } >
            {
                this.confirmButtonText
            } <
            /button> <
            /div>

            <
            /div>
        );
    }
}