import {
    autobind
} from 'core-decorators';

// import Hammer from 'hammerjs';

import {
    CustomComponent
} from '../../../../common/components';
import {
    subscribe
} from '../../../../../replete';
import {
    Icon
} from '../../../../common/components/Icon';

import {
    CaptionCanvas
} from '../components/Captioning';
import {
    CropGrid
} from '../components/Cropping';
import {
    GifBaseLayer,
    CaptionLayer
} from './layers';
import {
    ITEM_STATES,
    EDITOR_TOOL_TRACKING_ID
} from '../constants';
import clone from 'clone';

import './index.scss';

@subscribe({
    isMobile: ['ui.isMobile'],

    makerPage: ['ui.GifMakerPage.makerPage'],
    itemPageCaptioning: ['ui.GifMakerPage.itemPageCaptioning'],
    imagePanelBoundingRect: ['ui.GifMakerPage.imagePanelBoundingRect'],

    tool: ['ui.GifEditor.tool'],
    encodingStatus: ['ui.GifEditor.encodingStatus'],
    // editor: ['ui.GifEditor.editor'],
    editorBoundingRect: ['ui.GifEditor.editorBoundingRect'],
    trimData: ['ui.GifEditor.trimData'],
    cropData: ['ui.GifEditor.cropData'],
    captionData: ['ui.GifEditor.captionData'],
    captionLayers: ['ui.GifEditor.captionLayers'],

    editorToolsUsageTracking: ['ui.GifEditor.editorToolsUsageTracking'],
    trimToolUsageTracking: ['ui.GifEditor.trimToolUsageTracking'],
    cropToolUsageTracking: ['ui.GifEditor.cropToolUsageTracking'],
    captionToolUsageTracking: ['ui.GifEditor.captionToolUsageTracking'],
})
export class GifEditor extends CustomComponent {
    constructor(props, context) {
        super(props, context);
        this.state = {
            editorLoaded: false,
        };
        this.stopPreview = false;
        this.restartPreview = false;
        this.otherLayers = [];
        context.store.set('ui.GifEditor.captionLayers', [
            new CaptionLayer({}),
        ]);

        this.firstLoop = true;
        props.uploadObject.switchToOriginalGifData();

        this.setEditorFrames();
    }

    componentDidUpdate(prevProps) {
        // Animate gif on unpause
        if (!this.props.trimData.paused && prevProps.trimData.paused) {
            this.animateGif();
        }
        // Draw gif if current frame changes while paused
        if (this.props.trimData.paused && this.props.trimData.currentFrameIdx != prevProps.trimData.currentFrameIdx) {
            this.drawFrame(this.props.trimData.currentFrameIdx, true);
        }

        if (this.props.tool !== prevProps.tool) {
            this.restartPreview = true;
            this.animateGif();
        }
    }

    componentWillUnmount() {
        window && window.removeEventListener('resize', this.setEditorBoundingRect);
        this.stopPreview = true;
        this.context.store.call('ui.GifEditor', 'reset');
    }

    setEditorFrames() {
        this.props.uploadObject.getFrames()
            .then(this.initializeEditorSettings)
            .catch((error) => {
                // TODO return to tagging view if failure to get frames?
                console.error(error);
            });
    }

    @autobind
    initializeEditorSettings(frames) {
        const dims = this.props.uploadObject.getDims();
        this.uploadWidth = dims[0];
        this.uploadHeight = dims[1];

        this.frames = frames;
        this.baseLayer = new GifBaseLayer({
            frames
        });
        this.setAsyncSettings();
    }

    @autobind
    setAsyncSettings() {
        if (!this.GifEditor) {
            window.setTimeout(this.setAsyncSettings, 10);
            return;
        }
        this.setEditorBoundingRect();
        this.updateBackingDimensions();
        this.setState({
            editorWidth: this.GifEditor.offsetWidth,
            editorHeight: this.GifEditor.offsetHeight,
        });
        if (this.props.trimData.endFrameIdx === 0) { // FIXME is there a better way to determine if trimData already exists?
            this.context.store.set('ui.GifEditor.trimData', {
                paused: false,
                startFrameIdx: 0,
                currentFrameIdx: 0,
                endFrameIdx: this.frames.length - 1,
                frameRange: [0, this.frames.length - 1],
            });
        }
        this.context.store.set('ui.GifEditor.editor', this);

        if (this.props.uploadObject.gifHasBeenEdited()) {
            const editorSettings = this.props.uploadObject.editorSettings;
            this.context.store.set('ui.GifEditor.cropData', editorSettings.cropData);
            this.context.store.set('ui.GifEditor.trimData', editorSettings.trimData);
            this.applyCropping(true, editorSettings.cropData.cropCoords);
            this.context.store.set('ui.GifEditor.captionData', editorSettings.captionData);
        } else {
            this.context.store.set('ui.GifEditor.allowCaptionAutoRepositioning', true);
        }
        window && window.addEventListener('resize', this.setEditorBoundingRect);
        this.setState({
            editorLoaded: true
        });
        window.requestAnimationFrame(this.animateGif);
    }

    getState(key) {
        return this.state[key];
    }

    @autobind
    setEditorBoundingRect() {
        this.editorBoundingRect = this.GifEditor.getBoundingClientRect();
        this.context.store.set('ui.GifEditor.editorBoundingRect', this.editorBoundingRect);
        setTimeout(this.setEditorBoundingRectAgain, 10);
    }

    // FIXME HACK Necessary? Need to figure out how to keep calling setEditorBoundingRect OR ELSE not use editorBoundingRect dimensions for gif creation. Use imagePanelBoundingRect and calculate size on the fly with calculateImageDims?
    @autobind
    setEditorBoundingRectAgain() {
        this.editorBoundingRect = this.GifEditor.getBoundingClientRect();
        this.context.store.set('ui.GifEditor.editorBoundingRect', this.editorBoundingRect);
    }

    @autobind
    animateGif() {
        if (this.stopPreview || this.props.trimData.paused) {
            this.loopStartTS = null;
            this.currentFrameIdx = undefined;
            return;
        }

        if (!this.previewCtx) {
            // wait to see if it's ready for preview later
            window.setTimeout(this.animateGif, 250);
            return;
        }

        if (this.restartPreview) {
            this.loopStartTS = null;
            this.restartPreview = false;
            this.currentFrameIdx = this.props.trimData.startFrameIdx || 0;
        } else if (this.currentFrameIdx === undefined) {
            this.currentFrameIdx = this.props.trimData.currentFrameIdx || 0;
        }

        const currentTS = Date.now();
        if (!this.loopStartTS) {
            const pausedOffset = this.frames[this.currentFrameIdx].start; // FIXME replace with an offset when pause button used
            this.loopStartTS = currentTS - pausedOffset;
        }

        const elapsedMS = currentTS - this.loopStartTS;

        // Detect if enough of previous delay has passed
        // if so, advance frame.
        // Constantly referencing these offets helps reduce
        // timestamp slippage that happens over time as a result of
        // the time it takes to actually render a frame.
        // There will still be slippage between loops however.
        const currentFrame = this.frames[this.currentFrameIdx];
        // Subtracting instead of currentFrame.delay reduces
        // timestamp slippage.
        let timeout = Math.min(0, currentFrame.end - elapsedMS);

        // If the current frame should be over with, try the
        // next one. Otherwise, we have the frame we're looking
        // for.
        if (elapsedMS > currentFrame.end) {
            this.currentFrameIdx++;
            if (this.currentFrameIdx > this.props.trimData.endFrameIdx) {
                // Restart loop.
                this.firstLoop = false;
                this.currentFrameIdx = this.props.trimData.startFrameIdx;
                this.loopStartTS = null;
                timeout = currentFrame.delay;
            }
        }

        if (this.lastDrawnFrameIdx !== this.currentFrameIdx) {
            this.updateCurrentFrameIdx();
            this.drawFrame(this.currentFrameIdx, true);
            this.lastDrawnFrameIdx = this.currentFrameIdx;
        }
        window.setTimeout(() => {
            window.requestAnimationFrame(this.animateGif);
        }, timeout);
    }

    updateCurrentFrameIdx() {
        this.context.store.set('ui.GifEditor.trimData', Object.assign({},
            this.props.trimData, {
                currentFrameIdx: this.currentFrameIdx
            }
        ));
    }

    updateLayers(options) {
        this.baseLayer.update(options);

        for (const layer of this.otherLayers) {
            layer.update(options);
        }
        for (const layer of this.props.captionLayers) {
            layer.update(options);
        }
    }

    drawFrame(frameIdx, preview) {
        const canvas = preview ? this.previewCanvas : this.renderCanvas;
        const ctx = preview ? this.previewCtx : this.renderCtx;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        this.baseLayer.draw(frameIdx, preview);

        for (const layer of this.otherLayers) {
            layer.draw(frameIdx, preview);
        }
    }

    @autobind
    setPreviewCanvasElement(element) {
        if (!element) {
            return;
        }
        this.previewCanvas = element;
        this.previewCtx = this.previewCanvas ? this.previewCanvas.getContext('2d') : null;

        this.updateLayers({
            previewCanvas: this.previewCanvas,
            previewCtx: this.previewCtx,
        });
    }

    @autobind
    setRenderCanvasElement(element) {
        if (!element) {
            return;
        }
        this.renderCanvas = element;
        this.renderCtx = this.renderCanvas ? this.renderCanvas.getContext('2d') : null;
        this.updateLayers({
            renderCanvas: this.renderCanvas,
            renderCtx: this.renderCtx,
        });
    }

    @autobind
    setGifEditorElement(element) {
        if (!element) {
            return;
        }
        this.GifEditor = element;
    }

    @autobind
    applyCropping(applyCrop, cropCoords) {
        cropCoords = cropCoords || this.props.cropData.cropCoords;
        cropCoords = clone(cropCoords);

        if (!this.props.editorBoundingRect) {
            // FIXME HACK When attempting to edit a created gif, the editorBoundingRect
            // isn't set until the image loads on the page, causing timing errors.
            window.setTimeout(() => {
                this.applyCropping(applyCrop, cropCoords);
            }, 10);
            return;
        }

        if (this.isNotCropped()) {
            this.startEncodingGifIfPending();
            return;
        }

        if (!applyCrop) {
            this.removeCropping(cropCoords);
            return;
        }

        const widthScalingFactor = this.uploadWidth / this.props.editorBoundingRect.width;
        const heightScalingFactor = this.uploadHeight / this.props.editorBoundingRect.height;
        cropCoords = [
            [
                cropCoords[0][0] * widthScalingFactor,
                cropCoords[0][1] * heightScalingFactor,
            ],
            [
                cropCoords[1][0] * widthScalingFactor,
                cropCoords[1][1] * heightScalingFactor,
            ],
        ];

        const cropBackingWidth = cropCoords[1][0] - cropCoords[0][0];
        const cropBackingHeight = cropCoords[1][1] - cropCoords[0][1];
        this.updateBackingDimensions(cropBackingWidth, cropBackingHeight);


        this.updateLayers({
            cropCoords
        });
        this.updateCropData({
            isCropped: true
        });

        this.updateCaptionCoordsAfterApplyCrop();

        if (this.props.uploadObject.gifHasBeenEdited()) {
            this.context.store.set('ui.GifEditor.allowCaptionAutoRepositioning', true);
        }

        this.setEditorBoundingRect();
    }

    updateCaptionCoordsAfterApplyCrop() {
        const {
            captionCoords,
            captionText
        } = clone(this.props.captionData);
        const cropCoords = clone(this.props.cropData.cropCoords);

        const croppedGifDims = this.calculateImageDims({
            cropped: true
        });

        this.updateBackingDimensions(croppedGifDims);

        if (captionText.length) {
            const cropGridWidth = cropCoords[1][0] - cropCoords[0][0];
            const cropGridHeight = cropCoords[1][1] - cropCoords[0][1];

            const x0 = (captionCoords[0][0] - cropCoords[0][0]) * (croppedGifDims[0] / cropGridWidth);
            const y0 = (captionCoords[0][1] - cropCoords[0][1]) * (croppedGifDims[1] / cropGridHeight);
            const x1 = (captionCoords[1][0] - cropCoords[0][0]) * (croppedGifDims[0] / cropGridWidth);
            const y1 = (captionCoords[1][1] - cropCoords[0][1]) * (croppedGifDims[1] / cropGridHeight);

            this.updateCaptionData({
                captionCoords: [
                    [x0, y0],
                    [x1, y1]
                ],
                captionCanvasCroppedWidth: croppedGifDims[0],
                captionCanvasCroppedHeight: croppedGifDims[1],
            });
        }

        this.startEncodingGifIfPending();
    }

    startEncodingGifIfPending() {
        if (this.props.encodingStatus === ITEM_STATES.PENDING) {
            this.context.store.set('ui.GifEditor.encodingStatus', ITEM_STATES.INPROGRESS);
        }
    }

    updateCaptionCoordsAfterRemoveCropping() {
        const captionCoords = clone(this.props.captionData.captionCoords);
        const cropCoords = clone(this.props.cropData.cropCoords);

        const cropGridWidth = cropCoords[1][0] - cropCoords[0][0];
        const cropGridHeight = cropCoords[1][1] - cropCoords[0][1];
        const capCanvasWidth = this.props.captionData.captionCanvasWidth;
        const capCanvasHeight = this.props.captionData.captionCanvasHeight;

        const x0 = cropCoords[0][0] + (captionCoords[0][0] * (cropGridWidth / capCanvasWidth));
        const y0 = cropCoords[0][1] + (captionCoords[0][1] * (cropGridHeight / capCanvasHeight));
        const x1 = cropCoords[0][0] + (captionCoords[1][0] * (cropGridWidth / capCanvasWidth));
        const y1 = cropCoords[0][1] + (captionCoords[1][1] * (cropGridHeight / capCanvasHeight));

        this.updateCaptionData({
            captionCoords: [
                [x0, y0],
                [x1, y1]
            ],
            captionCanvasCroppedWidth: null,
            captionCanvasCroppedHeight: null,
        });
    }

    // TODO somewhat duplicative of same method in ImageViewer.js COMBINE?
    calculateImageDims(cropped) {
        let width;
        let height;
        const {
            cropCoords
        } = this.props.cropData;

        if (cropped && cropCoords) {
            width = cropCoords[1][0] - cropCoords[0][0];
            height = cropCoords[1][1] - cropCoords[0][1];
        } else {
            [width, height] = this.props.uploadObject.getDims();
        }
        const containerWidth = this.props.imagePanelBoundingRect.width;
        const containerHeight = this.props.imagePanelBoundingRect.height;
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

    resetCropCoords() {
        this.updateLayers({
            cropCoords: undefined
        });
        this.updateBackingDimensions();
        this.updateCropData({
            cropCoords: null,
            isCropped: false,
            cropRatio: false,
        });

        this.updateCaptionCoordsAfterRemoveCropping();
        this.setEditorBoundingRect();
    }

    removeCropping() {
        this.updateLayers({
            cropCoords: undefined
        });
        this.updateBackingDimensions();
        this.updateCropData({
            isCropped: false
        });

        this.updateCaptionCoordsAfterRemoveCropping();
        this.setEditorBoundingRect();
    }

    updateCropData(data) {
        const cropData = this.props.cropData;
        this.context.store.set('ui.GifEditor.cropData', Object.assign({}, cropData, data));
    }

    updateCaptionData(data) {
        const captionData = this.props.captionData;
        this.context.store.set('ui.GifEditor.captionData', Object.assign({}, captionData, data));
    }

    isNotCropped(cropCoords) {
        cropCoords = cropCoords || this.props.cropData.cropCoords;
        if (!cropCoords) {
            return true;
        }
        return (
            cropCoords[0][0] == 0 &&
            cropCoords[0][1] == 0 &&
            cropCoords[1][0] == Math.floor(this.props.editorBoundingRect.width) &&
            cropCoords[1][1] == Math.floor(this.props.editorBoundingRect.height)
        );
    }

    @autobind
    switchTo(tool) {
        const prevTool = this.props.tool;

        if (tool === 'trimming') {
            this.context.store.set('ui.GifEditor.tool', 'trimming');
            if (prevTool === 'cropping') {
                this.applyCropping(true);
            }
        }

        if (tool === 'cropping') {
            this.context.store.set('ui.GifEditor.captionData', Object.assign({}, this.props.captionData, {
                captionCanvasWidth: this.props.editorBoundingRect.width,
                captionCanvasHeight: this.props.editorBoundingRect.height,
            }));
            this.context.store.set('ui.GifEditor.tool', 'cropping');
            this.applyCropping(false);
        }

        if (tool === 'captioning') {
            this.context.store.set('ui.GifEditor.tool', 'captioning');
            if (prevTool === 'cropping') {
                this.applyCropping(true);
            }
        }
    }

    applyCaptionsToCanvas() {
        for (const captionLayer of this.props.captionLayers) {
            if (!captionLayer.text.length) {
                continue;
            }
            captionLayer.update({
                renderCanvas: this.renderCanvas,
                renderCtx: this.renderCtx,
            });
            this.otherLayers.push(captionLayer); // FIXME otherLayers necessary?
        }
    }

    @autobind
    updateProgress(progress) {
        this.props.uploadObject.editorStatus = progress;
        this.props.makerPage.setState({
            queueUpdated: true
        });
    }

    prepareEditorForGifCreation() {
        if (this.props.tool === 'cropping') {
            this.context.store.set('ui.GifEditor.encodingStatus', ITEM_STATES.PENDING);
            this.applyCropping(true);
        } else {
            this.context.store.set('ui.GifEditor.encodingStatus', ITEM_STATES.INPROGRESS);
        }
        this.applyCaptionsToCanvas();
        return this.editorReadyPromise();
    }

    @autobind
    editorReadyPromise() {
        if (this.props.encodingStatus === ITEM_STATES.INPROGRESS) {
            return Promise.resolve({
                captionData: clone(this.props.captionData),
                trimData: clone(this.props.trimData),
                cropData: clone(this.props.cropData),
            });
        } else {
            return new Promise((resolve) => setTimeout(resolve, 100)).then(() => this.editorReadyPromise());
        }
    }

    @autobind
    updateBackingDimensions(dims) {
        if (!dims) {
            const resizeFactor = this.props.editorBoundingRect.width / this.uploadWidth;
            this.backingWidth = this.uploadWidth * resizeFactor;
            this.backingHeight = this.uploadHeight * resizeFactor;
        } else {
            this.backingWidth = dims[0];
            this.backingHeight = dims[1];
        }
        this.triggerUpdate();
    }

    updateToolTrackingState(tool, state) {
        if (this.props.itemPageCaptioning.status) {
            return; // NOTE we don't want to track item page captioning editing
        }
        let editorTrackingID;
        if (tool === 'crop') {
            editorTrackingID = EDITOR_TOOL_TRACKING_ID.CROP;
            const trackingState = clone(this.props.cropToolUsageTracking);
            if (!trackingState.actions[state.actions] || trackingState.info != state.info) {
                trackingState.actions[state.actions] = true;
                trackingState.info = state.info;
                this.context.store.set('ui.GifEditor.cropToolUsageTracking', trackingState);
            }
        } else if (tool === 'caption') {
            editorTrackingID = EDITOR_TOOL_TRACKING_ID.CAPTION;
            const trackingState = clone(this.props.captionToolUsageTracking);
            if (!trackingState.actions[state.actions]) {
                trackingState.actions[state.actions] = true;
                this.context.store.set('ui.GifEditor.captionToolUsageTracking', trackingState);
            }
        } else if (tool === 'trim') {
            editorTrackingID = EDITOR_TOOL_TRACKING_ID.TRIM;
            const trackingState = clone(this.props.trimToolUsageTracking);
            if (!trackingState.actions[state.actions]) {
                trackingState.actions[state.actions] = true;
                this.context.store.set('ui.GifEditor.trimToolUsageTracking', trackingState);
            }
        }

        if (editorTrackingID && !this.props.editorToolsUsageTracking[editorTrackingID]) {
            const editorToolsUsageTracking = clone(this.props.editorToolsUsageTracking);
            editorToolsUsageTracking[editorTrackingID] = true;
            this.context.store.set('ui.GifEditor.editorToolsUsageTracking', editorToolsUsageTracking);
        }
    }

    trackToolUsageEvent() {
        const {
            makerPage,
            tool,
            trimToolUsageTracking,
            cropToolUsageTracking,
            captionToolUsageTracking,
            uploadObject,
        } = this.props;

        if (tool === 'trimming' && Object.keys(trimToolUsageTracking.actions).length) {
            makerPage.trackEvent({
                eventName: 'editing_trim_apply',
                params: {
                    'actions': trimToolUsageTracking.actions,
                    'category': uploadObject.getOriginalMediaType(),
                },
            });
            this.context.store.set('ui.GifEditor.trimToolUsageTracking', {
                actions: {},
            });
        } else if (tool === 'cropping' && Object.keys(cropToolUsageTracking.actions).length) {
            makerPage.trackEvent({
                eventName: 'editing_crop_apply',
                params: {
                    'actions': cropToolUsageTracking.actions,
                    'info': cropToolUsageTracking.info,
                    'category': uploadObject.getOriginalMediaType(),
                },
            });
            this.context.store.set('ui.GifEditor.cropToolUsageTracking', {
                actions: {},
                info: null,
            });
        } else if (tool === 'captioning' && Object.keys(captionToolUsageTracking.actions).length) {
            makerPage.trackEvent({
                eventName: 'editing_caption_apply',
                params: {
                    'actions': captionToolUsageTracking.actions,
                    'category': uploadObject.getOriginalMediaType(),
                },
            });
            this.context.store.set('ui.GifEditor.captioningToolUsageTracking', {
                actions: {},
            });
        }
    }

    render() {
            return ( <
                div id = "GifEditor"
                ref = {
                    this.setGifEditorElement
                } >
                {
                    this.state.editorLoaded && < canvas className = "preview"
                    width = {
                        this.backingWidth
                    }
                    height = {
                        this.backingHeight
                    }
                    ref = {
                        this.setPreviewCanvasElement
                    } >
                    < /canvas>} {
                        this.state.editorLoaded && this.props.editorBoundingRect && < canvas className = "render"
                        width = {
                            this.backingWidth
                        }
                        height = {
                            this.backingHeight
                        }
                        ref = {
                                this.setRenderCanvasElement
                            } >
                            < /canvas>}

                        {
                            this.props.editorBoundingRect &&
                                <
                                CaptionCanvas / >
                        }

                        {
                            this.props.editorBoundingRect && this.props.tool === 'cropping' &&
                                <
                                CropGrid / >
                        } {
                            !this.state.editorLoaded &&
                                <
                                div className = "img-preview-container" > {
                                    this.props.uploadObject.onlyHasVideoData() &&
                                    <
                                    video
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
                                        this.props.uploadObject.videoData.video.src
                                    }
                                    type = "video/mp4" /
                                    >
                                }

                            {
                                !this.props.uploadObject.onlyHasVideoData() &&
                                    <
                                    img
                                src = {
                                    this.props.uploadObject.gifData.image.src
                                }
                                />
                            }

                            <
                            div className = "overlay" >
                                <
                                Icon name = "spinner"
                            spin = {
                                true
                            }
                            /> <
                            /div> <
                            /div>
                        } <
                        /div>
                    );
                }
            }