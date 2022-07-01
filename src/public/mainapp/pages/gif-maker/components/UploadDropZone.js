import {
    autobind
} from 'core-decorators';

import {
    Component
} from 'inferno'; // eslint-disable-line no-unused-vars
import {
    CustomComponent
} from '../../../../common/components';
import {
    SETTINGS
} from '../constants';
import './UploadDropZone.scss';

class AbstractUploadDropZone extends CustomComponent {
    constructor(props, context) {
        super(props, context);
        this.state = {
            dragHover: false,
        };
        if (this.props.id === undefined) {
            throw new Error(`'id' required for UploadDropZone.`);
        }
        if (this.context.featureFlags.staticImageBetaEnabled) {
            this.accept = SETTINGS.FILE_PICKER_ACCEPT.concat(', ').concat(SETTINGS.FILE_PICKER_STATIC_ACCEPT);
        } else {
            this.accept = SETTINGS.FILE_PICKER_ACCEPT;
        }
        if (props.fullPage) {
            window.addEventListener('dragover', this.setDragListenerForFullPageDropZone, true);
        }
    }

    @autobind
    setDragListenerForFullPageDropZone() {
        this.setState({
            dragHover: true
        });
    }

    componentWillUnmount() {
        window.removeEventListener('dragover', this.setDragListenerForFullPageDropZone, true);
    }

    @autobind
    dropHandler(e) {
        e.preventDefault();
        e.stopPropagation();
        if (!this.props.disabled && e.dataTransfer) {
            this.props.onChange(e);
        }
        this.setState({
            dragHover: false
        });
    }

    @autobind
    dragEnterHandler(e) {
        e.preventDefault();
        e.stopPropagation();
        if (this.props.disabled) {
            this.setState({
                dragHover: false
            });
        } else {
            this.setState({
                dragHover: true
            });
            this.props.onDragEnter && this.props.onDragEnter();
            e.dataTransfer.dropEffect = 'copy';
        }
    }

    @autobind
    dragLeaveHandler(e) {
        e.preventDefault();
        e.stopPropagation();
        this.props.onDragLeave && this.props.onDragLeave();
        this.setState({
            dragHover: false
        });
    }

    // NB: required for onDrop to work
    @autobind
    dragOverHandler(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    @autobind
    onClick() {
        const {
            onClick
        } = this.props;
        onClick && onClick();
        // allows detection if same file is uploaded twice in a row
        // https://stackoverflow.com/questions/12030686
        this.inputElement.value = null;
    }

    @autobind
    setInputElement(inputElement) {
        this.inputElement = inputElement;
        this.props.reference && this.props.reference(inputElement);
    }
}

export class UploadButton extends AbstractUploadDropZone {
    // NOTE (accessibility): trigger file picker to open when user tabs to button and presses enter
    @autobind
    triggerFilePicker(e) {
        if (e.keyCode === 13) {
            this.inputElement.click();
        }
    }
    render() {
        const gettextSub = this.context.gtService.gettextSub;
        let {
            id,
            className,
            disabled,
            multiple,
            onChange
        } = this.props;
        className = className || '';
        className += ' UploadButton';

        return ( <
            button aria - label = {
                gettextSub('Browse Files to Upload')
            }
            role = 'button'
            className = {
                className
            }
            onKeyDown = {
                this.triggerFilePicker
            } >
            {
                this.props.children
            } <
            label
            for = {
                `upload_file_dropzone-${id}`
            }
            className = {
                `dropzone`
            } >
            <
            input id = {
                `upload_file_dropzone-${id}`
            }
            type = "file"
            name = "files"
            ref = {
                this.setInputElement
            }
            onClick = {
                this.onClick
            }
            onChange = {
                onChange
            }
            disabled = {
                disabled
            }
            accept = {
                this.accept
            }
            multiple = {
                multiple
            }
            /> <
            /label> <
            /button>
        );
    }
}

export class UploadDropZone extends AbstractUploadDropZone {
    render() {
        let {
            id,
            className,
            disabled,
            multiple,
            onChange
        } = this.props;
        className = className || '';
        className += ' UploadDropZone dropzone';
        className += this.state.dragHover ? ' draghover' : '';
        className += this.props.fullPage ? ' fullpage' : '';

        return ( <
            label
            for = {
                `upload_file_dropzone-${id}`
            }
            className = {
                className
            }
            onDrop = {
                this.dropHandler
            }
            onDragEnter = {
                this.dragEnterHandler
            }
            onDragLeave = {
                this.dragLeaveHandler
            }
            onDragEnd = {
                this.dragLeaveHandler
            }
            onDragOver = {
                this.dragOverHandler
            } >
            {
                this.props.children
            } <
            input id = {
                `upload_file_dropzone-${id}`
            }
            type = "file"
            name = "files"
            ref = {
                this.setInputElement
            }
            onClick = {
                this.onClick
            }
            onChange = {
                onChange
            }
            disabled = {
                disabled
            }
            accept = {
                this.accept
            }
            multiple = {
                multiple
            }
            /> <
            /label>
        );
    }
}