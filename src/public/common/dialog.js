import {
    autobind
} from 'core-decorators';

import {
    Component
} from 'inferno'; // eslint-disable-line no-unused-vars

import emitter from 'tiny-emitter/instance';

import {
    document,
    scrollbarVisible
} from './util';
import storageService from './services/storageService';


const openTracking = {
    key: 'dialog-open-counts',
    counts: {},
    getCount: (id) => {
        return openTracking.counts[id] || 0;
    },
    incrementCount: (id) => {
        openTracking.counts[id] = openTracking.getCount(id);
        openTracking.counts[id]++;
        storageService.setItem(openTracking.key, JSON.stringify(openTracking.counts));
    },
};

if (storageService.getItem(openTracking.key)) {
    openTracking.counts = JSON.parse(storageService.getItem(openTracking.key));
}


let dialogEl = null;
let resolveDialogContainerMounted = null;
const dialogPromise = new Promise((resolve) => {
    resolveDialogContainerMounted = resolve;
});

const dialog = {
    open: function open(id, data) {
        dialogPromise.then(() => {
            if (dialogEl) {
                const eventInit = {
                    detail: {
                        id,
                        data,
                    },
                };
                if (dialog.isOpen()) {
                    dialogEl.dispatchEvent(new CustomEvent('dialog-transition', eventInit));
                } else {
                    dialogEl.dispatchEvent(new CustomEvent('dialog-open', eventInit));
                }
            }
        });
    },
    close: function close() {
        dialogPromise.then(() => {
            if (dialogEl) {
                dialogEl.dispatchEvent(new CustomEvent('dialog-close'));
            }
        });
    },
    isOpen: function() {
        return dialogEl ? Boolean(dialogEl.id) : false;
    },
};

export default dialog;


export class DialogContainer extends Component {
    constructor(props, context) {
        super(props, context);

        this.state = this.defaultState();
        this.animationDuration = 300; // NOTE must match '$animationDuration' variable in dialog.scss'
    }
    defaultState() {
        return ({
            dialogId: null,
            dialogData: null,
            isBlockingDialog: false,
        });
    }
    componentDidMount() {
        dialogEl = this.element;
        resolveDialogContainerMounted(dialogEl);
        this.element.addEventListener('dialog-open', this.open);
        this.element.addEventListener('dialog-close', this.close);
        this.element.addEventListener('dialog-transition', this.transition);
    }
    componentWillUnmount() {
        dialogEl = null;
        this.element.removeEventListener('dialog-open', this.open);
        this.element.removeEventListener('dialog-close', this.close);
        this.element.removeEventListener('dialog-transition', this.transition);
    }
    @autobind
    setElement(element) {
        this.element = element;
    }
    getMapOptions(id) {
        const def = this.props.dialogMap[id];
        return (def && def.options) || {};
    }

    @autobind
    open(event) {
        console.log('DialogContainer.open', event.detail);
        const id = event.detail.id;
        openTracking.incrementCount(id);
        const timesOpened = openTracking.getCount(id);
        const {
            maxCloseActions,
            isBlockingDialog
        } = this.getMapOptions(id);
        this.setState({
            dialogId: id,
            dialogData: event.detail.data,
            isBlockingDialog: isBlockingDialog || (maxCloseActions && (timesOpened - 1) >= maxCloseActions),
        });
        /* NOTE: We need to ensure that the scrollbar will remain visible if it
            is visible before opening a dialog. Otherwise, the page will resize
            when the dialog opens and the scrollbar is removed. Only an issue
            for browsers that don't auto-hide the scroll bar (eg. chromeon linux).*/
        scrollbarVisible() && document.body.classList.add('force-scrollbar-visible');
        document.body.classList.add('ngdialog-open');
    }

    @autobind
    closeHandler() {
        !this.state.isBlockingDialog && this.close();
    }

    @autobind
    close() {
        !this.isClosing && this.closePromise();
    }

    closePromise() {
        return new Promise((resolve) => {
            emitter.emit('DialogContainer.startClose', {
                dialogId: this.state.dialogId
            });
            this.isClosing = true;
            this.element.classList.add('ngdialog-closing');

            if (!this.isTransitioning) {
                this.element.classList.remove('ngdialog-transitioning');
            }

            setTimeout(() => {
                this.isClosing = false;
                this.element.classList.remove('ngdialog-closing');

                if (!this.isTransitioning) {
                    document.body.classList.remove('ngdialog-open', 'force-scrollbar-visible');
                }
                this.setState(this.defaultState());
                emitter.emit('DialogContainer.finishClose');
                resolve();
            }, this.animationDuration);
        });
    }

    @autobind
    transition(event) {
        this.element.classList.add('ngdialog-transitioning');
        this.isTransitioning = true;
        if (this.isClosing) {
            this.nextDialogEvent = event;
            emitter.on('DialogContainer.finishClose', this.transitionOnCloseFinish);
        } else {
            this.closePromise().then(() => this.openNextDialog(event));
        }
    }

    @autobind
    transitionOnCloseFinish() {
        emitter.off('DialogContainer.finishClose', this.transitionOnCloseFinish);
        this.openNextDialog(this.nextDialogEvent);
    }

    @autobind
    openNextDialog(event) {
        this.open(event);
        setTimeout(() => {
            this.isTransitioning = false;
        }, this.animationDuration);
    }

    render() {
            const dialog = [];
            // JSX requires that this be uppercase.
            let DialogClass;
            let classOptions;
            const dialogData = this.state.dialogData || {};
            let allProps;
            let dialogStyle = {};

            for (const id in this.props.dialogMap) {
                if (id == this.state.dialogId) {
                    DialogClass = this.props.dialogMap[id]['class'];
                    dialogStyle = Object.assign({}, dialogStyle, this.props.dialogMap[id]['style']);
                    classOptions = this.props.dialogMap[id]['options'] || {};
                    allProps = Object.assign({}, classOptions, dialogData);
                    allProps.timesOpened = openTracking.getCount(id);

                    dialog.push( < DialogClass id = {
                            id
                        }
                        dialog = {
                            this
                        } { ...allProps
                        }
                        />);
                    }
                }
                if (dialog.length && !this.state.isBlockingDialog) {
                    dialog.push( < div className = "ngdialog-close"
                        onClick = {
                            this.closeHandler
                        } > < /div>);
                    }
                    let className = 'DialogContainer';
                    if (dialog.length > 0 || this.isTransitioning) {
                        className += ' ngdialog ngdialog-theme-default';
                    }
                    return ( <
                        div id = {
                            this.state.dialogId
                        }
                        ref = {
                            this.setElement
                        }
                        className = {
                            className
                        } >
                        {
                            (dialog.length > 0 || this.isTransitioning) &&
                            <
                            div className = "ngdialog-overlay"
                            onClick = {
                                this.closeHandler
                            }
                            />
                        } {
                            dialog.length > 0 &&
                                <
                                div
                            className = {
                                `${'ngdialog-content' + ' ngdialog-container-'}${this.state.dialogId}`
                            }
                            style = {
                                    dialogStyle
                                } >
                                {
                                    dialog
                                } <
                                /div>
                        } <
                        /div>
                    );
                }
            }