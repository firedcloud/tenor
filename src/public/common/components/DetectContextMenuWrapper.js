import {
    autobind
} from 'core-decorators';
import {
    Component
} from 'inferno'; // eslint-disable-line no-unused-vars
import {
    iOS
} from '../util/isMobile';

/*
 *   Wrapper component that can detect iOS long press events to simulate the
 *   onContextMenu event.
 *   NB: Mobile device testing and Google Analytics data confirm that iOS does
 *   not support 'contextmenu' event handling (iOS version > 5.0). I tried to
 *   dynamically detect support by checking if a DOM element has the event as a
 *   property value. Unfortunately, testing this method on iOS affirmed inclusion
 *   of the property despite not actually supporting it.
 */
export class DetectContextMenuWrapper extends Component {
    constructor(props, context) {
        super(props, context);
        this.contextMenuEventNotSupported = iOS();
        this.longPressTimeout = 1200;
    }

    @autobind
    contextMenuHandler() {
        if (this.contextMenuEventNotSupported) {
            return;
        }
        this.triggerContextMenuCallback();
    }

    @autobind
    startLongPress() {
        if (this.contextMenuEventNotSupported) {
            this.timeout = setTimeout(
                this.triggerContextMenuCallback,
                this.longPressTimeout
            );
        }
    }

    @autobind
    cancelLongPress() {
        if (this.contextMenuEventNotSupported) {
            this.timeout && clearTimeout(this.timeout);
        }
    }

    @autobind
    triggerContextMenuCallback() {
        this.props.callback && this.props.callback();
    }

    render() {
        return ( <
            div onTouchStart = {
                this.startLongPress
            }
            onTouchEnd = {
                this.cancelLongPress
            }
            onTouchCancel = {
                this.cancelLongPress
            }
            onTouchMove = {
                this.cancelLongPress
            }
            onContextMenu = {
                this.contextMenuHandler
            } >
            {
                this.props.children
            } <
            /div>
        );
    }
}