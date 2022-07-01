import {
    Component
} from 'inferno'; // eslint-disable-line no-unused-vars
import {
    autobind
} from 'core-decorators';

import {
    CustomComponent
} from '../../../../common/components';
import {
    Icon
} from '../../../../common/components/Icon';
import {
    NavigationPrompt
} from '../../../../common/components/NavigationPrompt';
import dialog from '../../../../common/dialog';
import {
    iOS
} from '../../../../common/util/isMobile';
import {
    ITEM_STATES,
    EDITOR_TOOL_TRACKING_ID
} from '../constants';
import {
    KEY
} from '../../../../common/constants';
import {
    CreateGifButton
} from '../components/CreateGifButton';
import {
    TrimScrubber
} from '../components/Trimming';
import {
    GifEditor
} from '../GifEditor';
import {
    subscribe
} from '../../../../../replete';
import {
    EditorPanel
} from './EditorPanel';

import './ImageViewer.scss';

@subscribe({
    isMobile: ['ui.isMobile'],

    makerPage: ['ui.GifMakerPage.makerPage'],
    itemPageCaptioning: ['ui.GifMakerPage.itemPageCaptioning'],
    queueIdx: ['ui.GifMakerPage.queueIdx'],
    view: ['ui.GifMakerPage.view'],
    imagePanelBoundingRect: ['ui.GifMakerPage.imagePanelBoundingRect'],

    editorBoundingRect: ['ui.GifEditor.editorBoundingRect'],
    encodingStatus: ['ui.GifEditor.encodingStatus'],
    editor: ['ui.GifEditor.editor'],
    trimData: ['ui.GifEditor.trimData'],
    cropData: ['ui.GifEditor.cropData'],
    tool: ['ui.GifEditor.tool'],
})
export class ImageViewer extends CustomComponent {
    constructor(props, context) {
        super(props, context);
        this.idxValues = this.getValidIndexValues();
        this.minWindowHeight = 200; // TODO should we set a larger minHeight for desktop vs. mobile?

        if (props.view === 'imageViewer') {
            props.makerPage.trackEvent({
                eventName: 'viewer_shown',
                params: {
                    'viewindex': this.idxValues.length
                },
            });
        }
        window && window.addEventListener('resize', this.setImagePanelBoundingRect);
        this.iOS = iOS();
    }

    componentDidMount() {
        window.addEventListener('keydown', this.handleOnKeyDown);
        window.addEventListener('resize', this.triggerUpdate);
        this.preventWindowScrollingOnMobile(true);

        if (this.props.isMobile) {
            // NOTE the virtual keyboard on mobile causes the page to resize when captioning
            // this is a hack to make sure that the editor doesn't resize
            if (iOS()) {
                // NOTE need to offset minHeight by ~ 60-150 to account for window
                // resizing due to nav buttons and address bar changing height in Safari
                this.minWindowHeight = window.innerHeight - 150;
            } else {
                // NOTE full window height for Android
                this.minWindowHeight = window.innerHeight;
            }
        }
    }

    componentWillUnmount() {
        window.removeEventListener('keydown', this.handleOnKeyDown);
        window.removeEventListener('resize', this.triggerUpdate);
        window.removeEventListener('resize', this.setImagePanelBoundingRect);

        this.preventWindowScrollingOnMobile(false);
    }

    preventWindowScrollingOnMobile(bool) {
        if (this.props.isMobile) {
            if (bool) {
                window.document.documentElement.classList.add('no-scroll');
                window.document.body.classList.add('no-scroll');
            } else {
                window.document.documentElement.classList.remove('no-scroll');
                window.document.body.classList.remove('no-scroll');
            }
        }
    }

    getValidIndexValues() {
        const values = [];
        this.props.queue.forEach((uploadObject, idx) => {
            if (uploadObject.uploadStatus !== ITEM_STATES.DONE) {
                values.push(idx);
            }
        });
        return values;
    }

    @autobind
    handleOnKeyDown(event) {
        if (this.props.view === 'editing') {
            return;
        }
        switch (event.keyCode) {
            case KEY.LEFT:
                if (this.isFirstImage()) {
                    break;
                }
                this.previousImage();
                break;
            case KEY.RIGHT:
                if (this.isLastImage()) {
                    break;
                }
                this.nextImage();
                break;
            case KEY.ESC:
                this.closeImageViewer();
                break;
            default:
                break;
        }
    }

    @autobind
    closeImageViewer() {
        const uploadObject = this.props.queue[this.props.queueIdx];
        if (uploadObject.gifHasBeenEdited()) {
            uploadObject.switchToEditedGifData();
        }
        this.context.store.set('ui.GifMakerPage.view', 'tagging');
    }

    @autobind
    returnToItemViewPage() {
        this.context.router.history.push(this.props.itemPageCaptioning.url);
    }

    @autobind
    closeEditorConfirmCallback() {
        const uploadObject = this.props.queue[this.props.queueIdx];
        if (this.props.itemPageCaptioning.status) {
            this.returnToItemViewPage();
        } else {
            if (!this.props.itemPageCaptioning.status) {
                this.props.makerPage.trackEvent({
                    eventName: 'editing_cancel_confirm',
                    params: {
                        'category': uploadObject.getOriginalMediaType(),
                    },
                });
            }
            this.closeImageViewer();
        }
    }

    @autobind
    closeEditor() {
        const uploadObject = this.props.queue[this.props.queueIdx];
        if (!this.props.itemPageCaptioning.status) {
            this.props.makerPage.trackEvent({
                eventName: 'editing_cancel_tap',
                params: {
                    'category': uploadObject.getOriginalMediaType(),
                },
            });
        }
        const gettextSub = this.context.gtService.gettextSub;
        dialog.open('confirmation-dialog', {
            confirmCallback: this.closeEditorConfirmCallback,
            header: gettextSub(`Cancel editing your GIF?`),
            message: gettextSub(`Changes you've made will not be saved.`),
            denyButtonText: gettextSub(`No`),
            confirmButtonText: gettextSub(`Yes`),
        });
    }

    @autobind
    previousImage(event) {
        event && event.stopPropagation();
        const queueIdx = this.idxValues[this.idxValues.indexOf(this.props.queueIdx) - 1];
        this.context.store.set('ui.GifMakerPage.queueIdx', queueIdx);
    }

    @autobind
    nextImage(event) {
        event && event.stopPropagation();
        const queueIdx = this.idxValues[this.idxValues.indexOf(this.props.queueIdx) + 1];
        this.context.store.set('ui.GifMakerPage.queueIdx', queueIdx);
    }

    @autobind
    handleRemoveButton() {
        const gettextSub = this.context.gtService.gettextSub;
        dialog.open('confirmation-dialog', {
            confirmCallback: this.removeUploadItem,
            header: gettextSub(`Delete?`),
            message: gettextSub(`This upload and its associated tags will not be uploaded.`),
        });
    }

    @autobind
    removeUploadItem() {
        const uploadObject = this.props.queue[this.props.queueIdx];
        this.props.makerPage.trackEvent({
            eventName: 'tagging_page_content_removed',
            params: {
                'category': uploadObject.getOriginalMediaType(),
            },
        });
        this.props.makerPage.removeGifFromQueue(this.props.queueIdx);
    }

    isFirstImage() {
        return this.idxValues[0] === this.props.queueIdx;
    }

    isLastImage() {
        return this.idxValues[this.idxValues.length - 1] === this.props.queueIdx;
    }

    calculateImageDims() { // NOTE somewhat duplicative of same method in GifEditor/index.js COMBINE?
        if (!this.imagePanelElement) {
            return [0, 0];
        }
        const uploadObject = this.props.queue[this.props.queueIdx];
        let width;
        let height;
        const {
            cropCoords,
            isCropped
        } = this.props.cropData;

        if (isCropped && cropCoords) {
            width = cropCoords[1][0] - cropCoords[0][0];
            height = cropCoords[1][1] - cropCoords[0][1];
        } else {
            [width, height] = uploadObject.getDims();
        }
        const containerWidth = this.imagePanelElement.offsetWidth;
        const containerHeight = this.imagePanelElement.offsetHeight;
        const maxWidth = containerWidth < 576 ? containerWidth : 576;
        const imageAspectRatio = width / height;
        const containerAspectRatio = maxWidth / containerHeight;
        if (imageAspectRatio > containerAspectRatio) {
            height = maxWidth / imageAspectRatio;
            width = maxWidth;
        } else {
            width = imageAspectRatio * containerHeight;
            height = containerHeight;
        }
        return [width, height];
    }

    @autobind
    setImagePanelElement(el) {
        if (!el) {
            return;
        }
        this.imagePanelElement = el;
        this.triggerUpdate();
        this.setImagePanelBoundingRect();
    }

    @autobind
    setImagePanelBoundingRect() {
        if (!this.imagePanelElement) {
            setTimeout(this.setImagePanelBoundingRect, 10);
            return;
        }
        this.imagePanelBoundingRect = this.imagePanelElement.getBoundingClientRect();
        if (this.imagePanelBoundingRect.height == 0 || this.imagePanelBoundingRect.width == 0) {
            setTimeout(this.setImagePanelBoundingRect, 10);
            return;
        }
        if (this.props.imagePanelBoundingRect) {
            const prevDims = [this.props.imagePanelBoundingRect.width, this.props.imagePanelBoundingRect.height];
            const dims = [this.imagePanelBoundingRect.width, this.imagePanelBoundingRect.height];
            if (prevDims[0] == dims[0] && prevDims[1] == dims[1]) {
                // NOTE might not actually need this check because dims will always change on resize
                return;
            }
        }
        this.context.store.set('ui.GifMakerPage.imagePanelBoundingRect', this.imagePanelBoundingRect);
    }

    renderGifEditorImage() {
        const uploadObject = this.props.queue[this.props.queueIdx];

        if (uploadObject.gifData || uploadObject.videoData) {
            return ( <
                GifEditor uploadObject = {
                    uploadObject
                }
                />
            );
        }
    }

    @autobind
    openEditorPanel(e) {
        e.stopPropagation();
        const uploadObject = this.props.queue[this.props.queueIdx];
        switch (e.currentTarget.className) {
            case 'crop-button':
                this.props.makerPage.trackEvent({
                    eventName: 'editing_crop_tap',
                    params: {
                        'category': uploadObject.getOriginalMediaType(),
                    },
                });
                this.context.store.set('ui.GifEditor.tool', 'cropping');
                this.context.store.set('ui.GifMakerPage.view', 'editing');
                break;
            case 'caption-button':
                this.props.makerPage.trackEvent({
                    eventName: 'editing_caption_tap',
                    params: {
                        'category': uploadObject.getOriginalMediaType(),
                    },
                });
                this.context.store.set('ui.GifEditor.tool', 'captioning');
                this.context.store.set('ui.GifMakerPage.view', 'editing');
                break;
            case 'trim-button':
                this.props.makerPage.trackEvent({
                    eventName: 'editing_trim_tap',
                    params: {
                        'category': uploadObject.getOriginalMediaType(),
                    },
                });
                this.context.store.set('ui.GifEditor.tool', 'trimming');
                this.context.store.set('ui.GifMakerPage.view', 'editing');
                break;
        }
    }

    @autobind
    handleResetButton(e) {
        const uploadObject = this.props.queue[this.props.queueIdx];
        let tool = this.props.tool;
        let trackingAction;
        if (!tool) {
            // HACK FYI: tool prop is set when EditorPanel component mounts.
            // need to retrieve the value if not yet propagated to ImageViewer
            tool = this.context.store.get('ui.GifEditor.tool');
        }
        if (tool === 'trimming') {
            trackingAction = EDITOR_TOOL_TRACKING_ID.TRIM;
            const trimData = this.props.trimData;
            this.context.store.set('ui.GifEditor.trimData', Object.assign({}, trimData, {
                startFrameIdx: trimData.frameRange[0],
                currentFrameIdx: trimData.frameRange[0],
                endFrameIdx: trimData.frameRange[1],
            }));
        }
        if (tool === 'cropping') {
            trackingAction = EDITOR_TOOL_TRACKING_ID.CROP;
            this.props.editor.resetCropCoords();
        }
        if (tool === 'captioning') {
            trackingAction = EDITOR_TOOL_TRACKING_ID.CAPTION;
            this.context.store.set('ui.GifEditor.captionData', {
                captionText: '',
                captionFontSize: 32,
                captionColor: '#FFFFFF', // white
                captionCoords: null, // [[x0, y0], [x1, y1]]
            });
        }
        if (!this.props.itemPageCaptioning.status) {
            this.props.makerPage.trackEvent({
                eventName: 'editing_reset_tap',
                params: {
                    'actions': trackingAction,
                    'category': uploadObject.getOriginalMediaType(),
                },
            });
        }
    }

    @autobind
    handleStaticImageInfoButton() {
        return () => {
            dialog.open('confirmation-dialog', {
                header: this.context.gtService.gettextSub(`JPEG and PNG Files`),
                message: this.context.gtService.gettextSub(`We plan to add these uploads to search results in the future`),
                confirmButtonText: this.context.gtService.gettextSub(`OKAY`),
                options: {
                    hideDenyButton: true,
                },
            });
        };
    }

    render() {
        const gettextSub = this.context.gtService.gettextSub;
        const uploadObject = this.props.queue[this.props.queueIdx];
        if (!uploadObject) {
            return;
        }
        const gifData = uploadObject.gifData;
        const videoData = uploadObject.videoData;
        const [width, height] = this.calculateImageDims();
        const isEditable = !uploadObject.isStaticImageUpload();

        return ( <
            div className = "ImageViewer"
            style = {
                {
                    minHeight: `${this.minWindowHeight}px`,
                }
            } >
            <
            NavigationPrompt when = {!this.props.itemPageCaptioning.status
            }
            message = "Are you sure you want to leave this page?" /
            >
            <
            div className = "gif-image-panel" > {
                this.props.view === 'imageViewer' &&
                <
                div className = "header-buttons viewer" >
                <
                div className = "left" >
                <
                button
                className = "close-window-button"
                onClick = {
                    this.closeImageViewer
                } >
                <
                Icon name = "close-icon" / >
                <
                /button> <
                button
                className = "remove-queue-item-button"
                onClick = {
                    this.handleRemoveButton
                } >
                <
                Icon name = 'delete-icon' / >
                <
                /button> <
                /div>

                {
                    !isEditable &&
                        <
                        button
                    className = "info-button"
                    onClick = {
                            this.handleStaticImageInfoButton()
                        } >
                        <
                        Icon name = 'info-outline-icon' / >
                        <
                        /button>
                }

                {
                    isEditable &&
                        <
                        div className = "right" >
                        <
                        button
                    className = "trim-button"
                    onClick = {
                            this.openEditorPanel
                        } >
                        <
                        Icon name = "trim-icon" / >
                        <
                        /button>

                        <
                        button
                    className = "crop-button"
                    onClick = {
                            this.openEditorPanel
                        } >
                        <
                        Icon name = "crop-icon" / >
                        <
                        /button>

                        <
                        button
                    className = "caption-button"
                    onClick = {
                            this.openEditorPanel
                        } >
                        <
                        Icon name = "caption-icon" / >
                        <
                        /button> <
                        /div>
                } <
                /div>
            }

            {
                this.props.view === 'editing' &&
                    <
                    div className = "header-buttons editing" >
                    <
                    div className = "left" >
                    <
                    button
                className = "close-window-button"
                onClick = {
                        this.closeEditor
                    } >
                    <
                    Icon name = "close-icon" / >
                    <
                    /button> <
                    /div>

                {
                    this.props.editor &&
                        <
                        div className = "editor-buttons" >
                        <
                        button className = "reset-button"
                    onClick = {
                            this.handleResetButton
                        } > {
                            this.props.tool === 'trimming' && gettextSub('Reset Trim')
                        } {
                            this.props.tool === 'cropping' && gettextSub('Reset Crop')
                        } {
                            this.props.tool === 'captioning' && gettextSub('Reset Caption')
                        } <
                        /button> {
                            this.props.isMobile &&
                                <
                                CreateGifButton queue = {
                                    this.props.queue
                                }
                            />
                        } <
                        /div>
                } <
                /div>
            }

            <
            div className = {
                `img-panel ${this.iOS ? 'ios-swipe-padding-fix' : ''}`
            }
            ref = {
                this.setImagePanelElement
            } >
            <
            div className = "img-wrapper"
            style = {
                {
                    width,
                    height
                }
            } > {
                this.props.view === 'imageViewer' && !uploadObject.onlyHasVideoData() &&
                <
                img
                className = "gif-img-preview"
                src = {
                    gifData.image.src
                }
                />
            } {
                this.props.view === 'imageViewer' && uploadObject.onlyHasVideoData() &&
                    <
                    video
                className = "gif-img-preview"
                muted = {
                    true
                }
                playsinline = {
                    true
                }
                autoplay = {
                    true
                }
                loop = {
                    true
                }
                src = {
                    videoData.video.src
                }
                type = "video/mp4" /
                    >
            } {
                this.props.view === 'editing' && this.renderGifEditorImage()
            }

            {
                this.props.view === 'editing' && uploadObject.editorStatus !== null &&
                    <
                    div className = "progressbarv1"
                style = {
                    {
                        height: '3px',
                        width: `${uploadObject.editorStatus * 100}%`,
                    }
                } > < /div>
            } {
                !this.props.isMobile && this.props.view === 'editing' && this.props.editor &&
                    <
                    div className = "trim-scrubber-wrapper" >
                    <
                    TrimScrubber
                queue = {
                    this.props.queue
                }
                /> <
                /div>
            } <
            /div> <
            /div>

            {
                this.props.view === 'imageViewer' &&
                    <
                    button
                className = {
                    `previous-button ${this.isFirstImage() ? 'hidden' : ''}`
                }
                onClick = {
                        this.previousImage
                    } >
                    <
                    div className = "button-icon" >
                    <
                    img src = 'assets/icons/chevron-left-thin-icon.svg' / >
                    <
                    /div> <
                    /button>
            }

            {
                this.props.view === 'imageViewer' &&
                    <
                    button
                className = {
                    `next-button ${this.isLastImage() ? 'hidden' : ''}`
                }
                onClick = {
                        this.nextImage
                    } >
                    <
                    div className = "button-icon" >
                    <
                    img src = 'assets/icons/chevron-right-thin-icon.svg' / >
                    <
                    /div> <
                    /button>
            }

            <
            /div> {
                this.props.view === 'editing' &&
                    <
                    EditorPanel
                queue = {
                    this.props.queue
                }
                />
            } <
            /div>
        );
    }
}