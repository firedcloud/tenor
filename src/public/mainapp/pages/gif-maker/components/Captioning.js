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
    CAPTION_COLORS
} from '../constants';
import {
    iOS
} from '../../../../common/util/isMobile';
import {
    subscribe
} from '../../../../../replete';
import clone from 'clone';

import './Captioning.scss';

@subscribe({
    isMobile: ['ui.isMobile'],
    queueIdx: ['ui.GifMakerPage.queueIdx'],
    editor: ['ui.GifEditor.editor'],
    editorBoundingRect: ['ui.GifEditor.editorBoundingRect'],
    captionData: ['ui.GifEditor.captionData'],
    captionLayers: ['ui.GifEditor.captionLayers'],
})
export class CaptioningTools extends CustomComponent {
    constructor(props, context) {
        super(props, context);
    }

    @autobind
    handleCaptionInput(e) {
        this.props.editor.updateToolTrackingState('caption', {
            actions: 'num'
        });
        const captionText = e.target.value;
        this.updateCaptionData({
            captionText
        });
    }

    updateCaptionData(data) {
        const captionData = clone(this.props.captionData);
        this.context.store.set('ui.GifEditor.captionData', Object.assign({}, captionData, data));
    }

    setCaptionColor(hexColor) {
        this.props.editor.updateToolTrackingState('caption', {
            actions: 'ui'
        });
        if (hexColor === this.props.captionData.captionColor) {
            hexColor = CAPTION_COLORS['white'];
        }
        this.updateCaptionData({
            captionColor: hexColor
        });
    }

    renderHeader() {
        const gettextSub = this.context.gtService.gettextSub;
        return ( <
            div className = "section-header" >
            <
            h2 > {
                gettextSub('Caption')
            } < /h2> <
            p > {
                gettextSub('Make it yours to share with your friends')
            } < /p> <
            /div>
        );
    }

    render() {
        const gettextSub = this.context.gtService.gettextSub;
        const {
            captionText,
            captionColor
        } = this.props.captionData;
        const captionHeight = captionText.split(/[\n\r]/g).length * 22 + 6;

        return ( <
            div className = "CaptioningTools" > {!this.props.isMobile && this.renderHeader()
            } {
                !this.props.isMobile &&
                    <
                    div className = "tools-row" >
                    <
                    textarea
                placeholder = {
                    gettextSub('Say something...')
                }
                className = "caption-textarea"
                value = {
                    captionText
                }
                onInput = {
                    this.handleCaptionInput
                }
                style = {
                    {
                        height: `${captionHeight}px`
                    }
                }
                /> <
                /div>
            }

            {
                !this.props.isMobile && < div className = "caption-color-label" > < label > Text Color < /label></div >
            } <
            div className = "caption-colors" > {
                Object.keys(CAPTION_COLORS).map((color) => {
                    return ( <
                        button className = {
                            `caption-color-option ${captionColor === CAPTION_COLORS[color] ? 'selected' : ''}`
                        }
                        onClick = {
                            () => this.setCaptionColor(CAPTION_COLORS[color])
                        } >
                        <
                        div style = {
                            {
                                background: CAPTION_COLORS[color]
                            }
                        }
                        /> <
                        /button>
                    );
                })
            } <
            /div> <
            /div>
        );
    }
}


/*
 ******************************************************************************
 *                                                                            *
 ******************************************************************************
 */
@subscribe({
    cropData: ['ui.GifEditor.cropData'],
    captionData: ['ui.GifEditor.captionData'],
    captionLayers: ['ui.GifEditor.captionLayers'],
    tool: ['ui.GifEditor.tool'],
    editor: ['ui.GifEditor.editor'],
    editorBoundingRect: ['ui.GifEditor.editorBoundingRect'],
    encodingStatus: ['ui.GifEditor.encodingStatus'],
    allowCaptionAutoRepositioning: ['ui.GifEditor.allowCaptionAutoRepositioning'],
})
export class CaptionCanvas extends CustomComponent {
    constructor(props, context) {
        super(props, context);
        this.ios = iOS();
        this.minHeight = 30;
        this.minWidth = 50;
    }

    componentDidMount() {
        if (this.props.captionData.captionText.length) {
            this.resizeCaptionBoxToFitText();
        }
    }

    componentDidUpdate(prevProps) {
        if (prevProps.captionData.captionText !== this.props.captionData.captionText) {
            this.updateCaptionLayer();
            this.resizeCaptionBoxToFitText();
        }
        if (prevProps.captionData.captionColor !== this.props.captionData.captionColor) {
            this.updateCaptionLayer();
        }
        if (prevProps.editorBoundingRect !== this.props.editorBoundingRect) {
            // FIXME ? this seems to be called too often (every time switch tools)

            setTimeout(this.updateCaptionLayer, 0); // NOTE FIXME hack to make redrawing caption onto cropped canvas async -- need to determine why async is needed... (when switching from caption tool to crop tool and the gif is already cropped, caption does not appear unless async)
            this.resizeTextToFitCaptionBox();
        }
        if (this.props.tool != prevProps.tool) {
            if (prevProps.tool === 'cropping') {
                this.resizeTextToFitCaptionBox();
            }
            if (!this.props.captionData.captionText.length) {
                setTimeout(this.setDefaultCaptionCoords, 0);
            }
        }

        !this.props.captionData.captionCoords && this.setDefaultCaptionCoords();
    }

    @autobind
    setDefaultCaptionCoords() {
        const x = this.props.editorBoundingRect.width / 2;
        const y = this.props.editorBoundingRect.height;
        const captionFontSize = 50;
        this.updateCaptionData({
            captionCoords: [
                [x - 40, y - (captionFontSize * 2)],
                [x + 40, y - (captionFontSize * 1)],
            ],
            captionFontSize,
        });
    }

    captionCoordsValid() {
        const coords = this.props.captionData.captionCoords;
        return (
            coords[0][0] >= 0 &&
            coords[0][1] >= 0 &&
            coords[1][0] <= this.props.editorBoundingRect.width &&
            coords[1][1] <= this.props.editorBoundingRect.height
        );
    }

    updateCaptionData(data) {
        const captionData = clone(this.props.captionData);
        this.context.store.set('ui.GifEditor.captionData', Object.assign({}, captionData, data));
    }

    @autobind
    captionInputHandler(e) {
        this.props.editor.updateToolTrackingState('caption', {
            actions: 'ui'
        });
        const captionText = e.target.value || e.data || '';
        this.updateCaptionData({
            captionText
        });
    }

    @autobind
    setCaptionCanvasElement(element) {
        if (!element) {
            return;
        }
        this.captionCanvas = element;
        const captionCtx = element.getContext('2d');

        for (const caption of this.props.captionLayers) {
            const options = {
                captionCanvas: this.captionCanvas,
                captionCtx: captionCtx,
            };
            caption.update(options);
        }
        this.resizeCaptionBoxToFitText();
    }

    @autobind
    setCaptionBoxElement(element) {
        this.captionBoxElement = element;
    }

    @autobind
    setCaptionInputElement(element) {
        this.captionInputElement = element;
    }

    @autobind
    handleCaptionMoveStart(e) {
        if (this.props.tool != 'captioning') {
            return;
        }
        e.preventDefault();
        e.stopPropagation();
        this.captionInputElement.blur();
        this.setState({
            captionBoxDragging: true
        });
        this.startCaptionBoxResize(e);
    }

    @autobind
    handleCaptionBoxClick(clickEvent) {
        const handleCaptionBoxDeselect = () => {
            clickEvent = false;
        };
        const eventType = clickEvent.type;
        if (eventType.slice(0, 5) === 'mouse') {
            document.addEventListener('mouseup', handleCaptionBoxDeselect);
        } else if (eventType.slice(0, 5) === 'touch') {
            document.addEventListener('touchend', handleCaptionBoxDeselect);
        }
        window.setTimeout(() => {
            document.removeEventListener('mouseup', handleCaptionBoxDeselect);
            document.removeEventListener('touchend', handleCaptionBoxDeselect);

            if (clickEvent) {
                clickEvent.preventDefault();
                clickEvent.stopPropagation();
                this.captionInputElement.blur();
                this.setState({
                    captionBoxDragging: true
                });
                this.startCaptionBoxResize(clickEvent);
            }
        }, 300);
    }

    @autobind
    startCaptionBoxResize(e) {
        e.preventDefault();
        e.stopPropagation();
        this.props.editor.updateToolTrackingState('caption', {
            actions: 'ui'
        });

        let clientX;
        let clientY;
        if (e.type.slice(0, 5) === 'mouse') {
            document.addEventListener('mouseup', this.stopCaptionBoxResize);
            document.addEventListener('mousemove', this.redrawCaptionBox);
            clientX = e.clientX;
            clientY = e.clientY;
        } else if (e.type.slice(0, 5) === 'touch') {
            document.addEventListener('touchend', this.stopCaptionBoxResize);
            document.addEventListener('touchmove', this.redrawCaptionBox);
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        }
        let captionBoxTarget;
        let captionCoords = clone(this.props.captionData.captionCoords);

        switch (e.target.id) {
            case 'captionCanvas':
                [this.captionBoxWidth, this.captionBoxHeight] = this.getCaptionBoxDimensions();
                captionCoords = [
                    [clientX - (this.captionBoxWidth / 2) - this.props.editorBoundingRect.left, clientY - (this.captionBoxHeight / 2) - this.props.editorBoundingRect.top],
                    [clientX + (this.captionBoxWidth / 2) - this.props.editorBoundingRect.left, clientY + (this.captionBoxHeight / 2) - this.props.editorBoundingRect.top],
                ];
                this.updateCaptionData({
                    captionCoords
                });
                this.updateCaptionLayer();
                this.captionDragOffset = [
                    clientX - this.props.editorBoundingRect.left - captionCoords[0][0],
                    clientY - this.props.editorBoundingRect.top - captionCoords[0][1],
                ];
                captionBoxTarget = 'drag';
                break;
            case 'captionInput':
                this.captionDragOffset = [
                    clientX - this.props.editorBoundingRect.left - captionCoords[0][0],
                    clientY - this.props.editorBoundingRect.top - captionCoords[0][1],
                ];
                [this.captionBoxWidth, this.captionBoxHeight] = this.getCaptionBoxDimensions();
                captionBoxTarget = 'drag';
                break;
            case 'caption-corner-nw':
                this.state.captionCornerEngaged = true;
                captionBoxTarget = 'NW';
                break;
            case 'caption-corner-sw':
                this.state.captionCornerEngaged = true;
                captionBoxTarget = 'SW';
                break;
            case 'caption-corner-ne':
                this.state.captionCornerEngaged = true;
                captionBoxTarget = 'NE';
                break;
            case 'caption-corner-se':
                this.state.captionCornerEngaged = true;
                captionBoxTarget = 'SE';
                break;
        }
        this.state.captionBoxResize = true;
        this.state.captionBoxTarget = captionBoxTarget;
    }

    @autobind
    stopCaptionBoxResize(e) {
        this.resizeCaptionBoxToFitText();
        this.setState({
            captionBoxDragging: false,
            captionCornerEngaged: false,
        });

        if (e.type.slice(0, 5) === 'mouse') {
            document.removeEventListener('mousemove', this.redrawCaptionBox);
            document.removeEventListener('mouseup', this.stopCaptionBoxResize);
        } else if (e.type.slice(0, 5) === 'touch') {
            document.removeEventListener('touchmove', this.redrawCaptionBox);
            document.removeEventListener('touchend', this.stopCaptionBoxResize);
        }
    }

    @autobind
    redrawCaptionBox(e) { // eslint-disable-line complexity
        let clientX;
        let clientY;
        if (e.type.slice(0, 5) === 'mouse') {
            clientX = e.clientX;
            clientY = e.clientY;
        } else if (e.type.slice(0, 5) === 'touch') {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        }

        if (this.state.captionBoxResize) {
            let captionCoords = clone(this.props.captionData.captionCoords);
            let x = clientX - this.props.editorBoundingRect.left;
            let y = clientY - this.props.editorBoundingRect.top;
            const bounds = [
                [0, 0],
                [this.props.editorBoundingRect.width, this.props.editorBoundingRect.height]
            ];

            if (x < bounds[0][0]) {
                x = bounds[0][0];
            } else if (x > bounds[1][0]) {
                x = bounds[1][0];
            }

            if (y < bounds[0][1]) {
                y = bounds[0][1];
            } else if (y > bounds[1][1]) {
                y = bounds[1][1];
            }


            if (this.state.captionBoxTarget === 'drag') {
                const leftX = x - this.captionDragOffset[0];
                const rightX = leftX + this.captionBoxWidth;
                const topY = y - this.captionDragOffset[1];
                const bottomY = topY + this.captionBoxHeight;

                // NOTE caption boundary restriction removed:
                // if (leftX < 0) {
                //     leftX = 0;
                //     rightX = this.captionBoxWidth;
                // } else if (rightX > this.props.editorBoundingRect.width) {
                //     leftX = this.props.editorBoundingRect.width - this.captionBoxWidth;
                //     rightX = this.props.editorBoundingRect.width;
                // }
                //
                // if (topY < 0) {
                //     topY = 0;
                //     bottomY = this.captionBoxHeight;
                // } else if (bottomY > this.props.editorBoundingRect.height) {
                //     topY = this.props.editorBoundingRect.height - this.captionBoxHeight;
                //     bottomY = this.props.editorBoundingRect.height;
                // }
                captionCoords = [
                    [leftX, topY],
                    [rightX, bottomY]
                ];
            } else {
                // TODO ? move box coords equally on both side?
                // let textDimensions = this.getTextDimensions();
                // let textAspectRatio = textDimensions[0] / textDimensions[1];
                // let width;
                // let height;
                switch (this.state.captionBoxTarget) {
                    case 'NW':
                        // TODO ? introduce captionRatio to keep box bounded to text size (see also Crop handling)?
                        // I tried implementing but it wasn't a smooth experience
                        if (captionCoords[1][0] - x < this.minWidth) {
                            x = captionCoords[1][0] - this.minWidth;
                        }
                        if (captionCoords[1][1] - y < this.minHeight) {
                            y = captionCoords[1][1] - this.minHeight;
                        }

                        captionCoords[0] = [x, y];
                        break;
                    case 'SE':
                        if (x - captionCoords[0][0] < this.minWidth) {
                            x = captionCoords[0][0] + this.minWidth;
                        }
                        if (y - captionCoords[0][1] < this.minHeight) {
                            y = captionCoords[0][1] + this.minHeight;
                        }

                        captionCoords[1] = [x, y];
                        break;
                    case 'NE':
                        if (x - captionCoords[0][0] < this.minWidth) {
                            x = captionCoords[0][0] + this.minWidth;
                        }
                        if (captionCoords[1][1] - y < this.minHeight) {
                            y = captionCoords[1][1] - this.minHeight;
                        }
                        captionCoords[1][0] = x;
                        captionCoords[0][1] = y;
                        break;
                    case 'SW':
                        if (captionCoords[1][0] - x < this.minWidth) {
                            x = captionCoords[1][0] - this.minWidth;
                        }
                        if (y - captionCoords[0][1] < this.minHeight) {
                            y = captionCoords[0][1] + this.minHeight;
                        }
                        captionCoords[0][0] = x;
                        captionCoords[1][1] = y;
                        break;
                }
            }
            this.updateCaptionData({
                captionCoords
            });
            this.resizeTextToFitCaptionBox();
        }
    }

    @autobind
    resizeTextToFitCaptionBox() {
        let {
            captionText,
            captionCoords,
            captionFontSize
        } = clone(this.props.captionData);
        const captionBoxHeight = captionCoords[1][1] - captionCoords[0][1] - 2 * this.getCaptionBoxHeightPadding();
        const captionBoxWidth = captionCoords[1][0] - captionCoords[0][0] - 2 * this.getCaptionBoxWidthPadding();
        const textWidth = this.getTextDimensions()[0];
        const textHeight = this.getTextDimensions()[1];

        if (captionBoxWidth / captionBoxHeight < textWidth / textHeight) {
            captionFontSize = captionFontSize * captionBoxWidth / textWidth;
        } else if (captionBoxWidth / captionBoxHeight > textWidth / textHeight) {
            const lines = captionText.split(/[\n\r]/g).length;
            captionFontSize = captionBoxHeight / lines;
        }
        this.updateCaptionData({
            captionFontSize
        });
        this.updateCaptionLayer({
            fontSize: captionFontSize
        });
    }

    @autobind
    resizeCaptionBoxToFitText() {
        const {
            captionCoords,
            captionText
        } = clone(this.props.captionData);
        if (!this.props.allowCaptionAutoRepositioning || !captionText.length) {
            return;
        }

        const textWidth = this.getTextDimensions()[0];
        const textHeight = this.getTextDimensions()[1];

        const editor = this.props.editorBoundingRect;
        if (editor && (textWidth > editor.width * 1 || textHeight > editor.height * 1)) {
            this.updateFontSizeToFitCanvas();
            return;
        }

        captionCoords[1][1] = captionCoords[0][1] + textHeight + 2 * this.getCaptionBoxHeightPadding();
        const mid = captionCoords[0][0] + (captionCoords[1][0] - captionCoords[0][0]) / 2;
        captionCoords[1][0] = mid + (textWidth / 2) + this.getCaptionBoxWidthPadding();
        captionCoords[0][0] = mid - (textWidth / 2) - this.getCaptionBoxWidthPadding();

        this.updateCaptionData({
            captionCoords
        });
        this.props.tool === 'captioning' && this.moveCaptionBoxIfOutOfBounds();
        this.updateCaptionLayer();
    }

    // TODO ? also use this for cropped gif to make sure it is on the canvas
    moveCaptionBoxIfOutOfBounds() {
        if (!this.props.allowCaptionAutoRepositioning) {
            return;
        }
        const editor = this.props.editorBoundingRect;
        if (!editor || this.state.captionBoxDragging) {
            return;
        }
        const {
            captionCoords
        } = clone(this.props.captionData);
        const [captionBoxWidth, captionBoxHeight] = this.getCaptionBoxDimensions();
        let captionMoved = false;
        let captionResized = false;

        // NOTE I don't think there is a scenario where caption box width & height are larger than editor
        if (captionBoxWidth > editor.width) {
            captionCoords[0][0] = 0;
            captionCoords[1][0] = editor.width;
            captionMoved = true;
            captionResized = true;
        } else if (captionBoxHeight > editor.height) {
            captionCoords[0][1] = 0;
            captionCoords[1][1] = editor.height;
            captionMoved = true;
            captionResized = true;
        }

        const leftOffset = captionCoords[0][0];
        const rightOffset = captionCoords[1][0] - editor.width;
        if (leftOffset < 0) {
            captionCoords[0][0] -= leftOffset;
            captionCoords[1][0] -= leftOffset;
            captionMoved = true;
        } else if (rightOffset > 0) {
            captionCoords[0][0] -= rightOffset;
            captionCoords[1][0] -= rightOffset;
            captionMoved = true;
        }

        const topOffset = captionCoords[0][1];
        const bottomOffset = captionCoords[1][1] - editor.height;
        if (bottomOffset > 0) {
            captionCoords[0][1] -= bottomOffset;
            captionCoords[1][1] -= bottomOffset;
            captionMoved = true;
        } else if (topOffset < 0) {
            captionCoords[0][1] -= topOffset;
            captionCoords[1][1] -= topOffset;
            captionMoved = true;
        }
        captionMoved && this.updateCaptionData({
            captionCoords
        });
        captionResized && window.setTimeout(this.resizeTextToFitCaptionBox, 10); // NOTE async allows time for props to update before recalculation of font size
    }

    updateFontSizeToFitCanvas() {
        let captionFontSize = this.props.captionData.captionFontSize;
        captionFontSize -= 1;
        this.updateCaptionData({
            captionFontSize
        });
        this.updateCaptionLayer();
        window.setTimeout(this.resizeCaptionBoxToFitText, 0); // NOTE async allows time for props to update before recalculation of caption box
    }

    getCaptionBoxWidthPadding() {
        if (this.ios) { // HACK allow caption input to align with caption canvas
            return this.props.captionData.captionFontSize / 8;
        } else {
            return 2;
        }
    }

    getCaptionBoxHeightPadding() {
        return this.props.captionData.captionFontSize / 8;
    }

    getTextDimensions() {
        const minWidth = 40;
        const {
            captionText,
            captionFontSize
        } = clone(this.props.captionData);
        const ctx = this.captionCanvas.getContext('2d');

        const text = captionText.split(/[\n\r]/g);
        const height = captionFontSize * text.length;
        const width = text.reduce((max, line) => {
            const lineWidth = ctx.measureText(line).width;
            return Math.max(max, lineWidth);
        }, minWidth);
        return [width, height];
    }

    getCaptionBoxDimensions() {
        const {
            captionCoords
        } = clone(this.props.captionData);
        const width = captionCoords[1][0] - captionCoords[0][0];
        const height = captionCoords[1][1] - captionCoords[0][1];
        return [width, height];
    }

    @autobind
    updateCaptionLayer(options = {}) {
        const {
            captionText,
            captionCoords,
            captionFontSize,
            captionColor
        } = this.props.captionData;
        if (!captionCoords) {
            // FIXME HACK sometimes for item view captioning, captionCoords == null
            // need to investigate
            return;
        }

        for (const caption of this.props.captionLayers) {
            options = Object.assign({
                text: captionText,
                fontSize: captionFontSize,
                x: captionCoords[0][0] + (captionCoords[1][0] - captionCoords[0][0]) / 2,
                y: captionCoords[0][1],
                fillStyle: captionColor,
            }, options);

            caption.update(options);
            caption.draw(null, true);
        }
    }

    render() {
        const {
            captionText,
            captionCoords,
            captionFontSize,
            captionCanvasCroppedWidth,
            captionCanvasCroppedHeight,
        } = this.props.captionData;
        const {
            captionBoxDragging,
            captionCornerEngaged
        } = this.state;

        if (!captionCoords) {
            this.setDefaultCaptionCoords();
            return <div > < /div>;
        }
        let captionBoxAttributes = {};
        if (captionBoxDragging) {
            captionBoxAttributes = {
                readonly: 'readonly',
                unselectable: 'on',
            };
        }
        const canvasWidth = captionCanvasCroppedWidth ? captionCanvasCroppedWidth : this.props.editorBoundingRect.width;
        const canvasHeight = captionCanvasCroppedHeight ? captionCanvasCroppedHeight : this.props.editorBoundingRect.height;

        /*
            NB: all 3 mouse events are also fired when a 'touch tap'
            happens but not for a 'touch drag'.
            Order of events for a 'touch tap': touchstart, touchend, mousemove, mousedown, mouseup.
            Order of events for a 'touch drag' touchstart, touchmove, touchend
        */

        return ( <
            div className = "CaptionCanvas"
            style = {
                {
                    height: `100%`,
                    width: `100%`,
                    top: '0',
                    left: '0',
                }
            } >
            <
            canvas className = "caption"
            ref = {
                this.setCaptionCanvasElement
            }
            id = 'captionCanvas'
            width = {
                `${canvasWidth}px`
            }
            height = {
                `${canvasHeight}px`
            }
            onMouseDown = {
                this.handleCaptionMoveStart
            }
            onTouchStart = {
                this.handleCaptionMoveStart
            }
            /> {
                this.props.tool === 'captioning' &&
                    <
                    div
                className = "caption-box-container"
                ref = {
                    this.setCaptionBoxElement
                }
                style = {
                        {
                            width: `${captionCoords[1][0] - captionCoords[0][0]}px`,
                            height: `${captionCoords[1][1] - captionCoords[0][1]}px`,
                            left: `${captionCoords[0][0]}px`,
                            top: `${captionCoords[0][1]}px`,
                        }
                    } >
                    <
                    textarea
                id = "captionInput"
                ref = {
                    this.setCaptionInputElement
                }
                className = {
                    `${captionBoxDragging ? 'dragged' : ''}`
                }
                onInput = {
                    this.captionInputHandler
                }
                onMouseDown = {
                    this.handleCaptionBoxClick
                }
                onTouchStart = {
                    this.handleCaptionBoxClick
                }
                spellcheck = "false"
                autocomplete = "off"
                autocorrect = "off"
                autocapitalize = "off"
                wrap = 'hard'
                style = {
                    {
                        fontSize: `${captionFontSize}px`,
                        cursor: captionBoxDragging ? 'move' : 'pointer',
                        padding: `${this.getCaptionBoxHeightPadding()}px 0`,
                    }
                }
                value = {
                    captionBoxDragging || captionCornerEngaged ? '' : captionText
                } { ...captionBoxAttributes
                }
                /> <
                div
                id = 'caption-corner-nw'
                className = {
                    `${this.state.captionBoxDragging ? 'selected' : ''}`
                }
                onMouseDown = {
                    this.startCaptionBoxResize
                }
                onTouchStart = {
                        this.startCaptionBoxResize
                    } >
                    < div > < /div></div >
                    <
                    div
                id = 'caption-corner-ne'
                className = {
                    `${this.state.captionBoxDragging ? 'selected' : ''}`
                }
                onMouseDown = {
                    this.startCaptionBoxResize
                }
                onTouchStart = {
                        this.startCaptionBoxResize
                    } >
                    < div > < /div></div >
                    <
                    div
                id = 'caption-corner-sw'
                className = {
                    `${this.state.captionBoxDragging ? 'selected' : ''}`
                }
                onMouseDown = {
                    this.startCaptionBoxResize
                }
                onTouchStart = {
                        this.startCaptionBoxResize
                    } >
                    < div > < /div></div >
                    <
                    div
                id = 'caption-corner-se'
                className = {
                    `${this.state.captionBoxDragging ? 'selected' : ''}`
                }
                onMouseDown = {
                    this.startCaptionBoxResize
                }
                onTouchStart = {
                        this.startCaptionBoxResize
                    } >
                    < div > < /div></div >
                    <
                    /div>
            } <
            /div>
        );
    }
}