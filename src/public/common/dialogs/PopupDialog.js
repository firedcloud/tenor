import {
    Component
} from 'inferno'; // eslint-disable-line no-unused-vars
import {
    CustomComponent
} from '../components';
import {
    autobind
} from 'core-decorators';

export class PopupDialog extends CustomComponent {
    constructor(props, context) {
        super(props, context);
    }

    componentDidMount() {
        this.setDelayedClose();
    }

    setDelayedClose() {
        setTimeout(() => {
            this.element && this.props.dialog.close();
        }, this.props.closeDelay);
    }

    @autobind
    setElement(el) {
        this.element = el;
    }

    render() {
        return ( <
            div id = "popup-dialog"
            ref = {
                this.setElement
            } > {
                this.props.children
            } <
            /div>
        );
    }
}