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
    CROP_RATIOS
} from '../constants';
import {
    KEY
} from '../../../../common/constants';
import {
    subscribe
} from '../../../../../replete';
import clone from 'clone';

import './Cropping.scss';

@subscribe({
    isMobile: ['ui.isMobile'],
    queueIdx: ['ui.GifMakerPage.queueIdx'],
    editor: ['ui.GifEditor.editor'],
    editorBoundingRect: ['ui.GifEditor.editorBoundingRect'],
    cropData: ['ui.GifEditor.cropData'],
    editorToolsUsageTracking: ['ui.GifEditor.editorToolsUsageTracking'],
    cropToolUsageTracking: ['ui.GifEditor.cropToolUsageTracking'],
})
export class CroppingTools extends CustomComponent {
    constructor(props, context) {
        super(props, context);
    }

    updateCropData(data) {
        const cropData = this.props.cropData;
        this.context.store.set('ui.GifEditor.cropData', Object.assign({}, cropData, data));
    }

    setCropRatio(ratioKey) {
        let cropRatio = CROP_RATIOS[ratioKey];
        if (cropRatio === this.props.cropData.cropRatio) {
            cropRatio = false;
            ratioKey = null;
        }

        this.props.editor.updateToolTrackingState('crop', {
            actions: 'ui',
            info: ratioKey
        });
        this.updateCropData({
            cropRatio
        });
    }

    // TODO crop entry currently disabled
    // @autobind
    // handleSetCropDims(event) {
    //     // TODO figure out how to handle
    //     let val = parseInt(event.target.value);
    //     switch (event.target.name) {
    //     case 'crop-width':
    //         this.state.cropWidth = val;
    //         break;
    //     case 'crop-height':
    //         this.state.cropHeight = val;
    //         break;
    //     case 'crop-x-offset':
    //         this.state.cropOffsetX = val;
    //         break;
    //     case 'crop-y-offset':
    //         this.state.cropOffsetY = val;
    //         break;
    //     default:
    //     }
    //     this.triggerUpdate();
    // }

    @autobind
    handleCropDimsKeyDown(event) {
        let increment;
        if (event.keyCode === KEY.UP) {
            increment = 1;
        } else if (event.keyCode === KEY.DOWN) {
            increment = -1;
            // TODO crop entry disabled
            // } else if (event.keyCode === KEY.ENTER) {
            //     const cropCoords = [
            //         [this.state.cropOffsetX, this.state.cropOffsetY],
            //         [this.state.cropOffsetX + this.state.cropWidth, this.state.cropOffsetY + this.state.cropHeight],
            //     ];
            //     this.updateCropData({cropCoords});
            //     return;
        } else {
            return;
        }

        this.props.editor.updateToolTrackingState('crop', {
            actions: 'num'
        });

        const bounds = [
            [0, 0],
            [this.props.editorBoundingRect.width, this.props.editorBoundingRect.height]
        ];
        const minCropDim = 50;

        const cropCoords = clone(this.props.cropData.cropCoords);
        switch (event.target.name) {
            case 'crop-width':
                {
                    if (increment > 0) {
                        if (cropCoords[1][0] + increment <= bounds[1][0]) {
                            cropCoords[1][0] += increment;
                        } else if (cropCoords[0][0] - increment >= bounds[0][0]) {
                            cropCoords[0][0] -= increment;
                        } else {
                            return;
                        }
                    } else {
                        if (cropCoords[1][0] - cropCoords[0][0] + increment >= minCropDim) {
                            cropCoords[1][0] += increment;
                        } else {
                            return;
                        }
                    }
                    break;
                }
            case 'crop-height':
                {
                    if (increment > 0) {
                        if (cropCoords[1][1] + increment <= bounds[1][1]) {
                            cropCoords[1][1] += increment;
                        } else if (cropCoords[0][1] - increment >= bounds[0][1]) {
                            cropCoords[0][1] -= increment;
                        } else {
                            return;
                        }
                    } else {
                        if (cropCoords[1][1] - cropCoords[0][1] + increment >= minCropDim) {
                            cropCoords[1][1] += increment;
                        } else {
                            return;
                        }
                    }
                    break;
                }
            case 'crop-x-offset':
                {
                    const xLeft = cropCoords[0][0] + increment;
                    const xRight = cropCoords[1][0] + increment;
                    if (xLeft < bounds[0][0] || xRight > bounds[1][0]) {
                        return;
                    }
                    cropCoords[0][0] = xLeft;
                    cropCoords[1][0] = xRight;
                    break;
                }
            case 'crop-y-offset':
                {
                    const yTop = cropCoords[0][1] + increment;
                    const yBottom = cropCoords[1][1] + increment;
                    if (yTop < bounds[0][1] || yBottom > bounds[1][1]) {
                        return;
                    }
                    cropCoords[0][1] = yTop;
                    cropCoords[1][1] = yBottom;
                    break;
                }
        }

        this.updateCropData({
            cropCoords
        });
    }

    renderAspectRatioButtons() {
        const gettextSub = this.context.gtService.gettextSub;
        const {
            cropRatio
        } = this.props.cropData;

        return ( <
            div className = "crop-dim-setting" > {!this.props.isMobile && < label > {
                    gettextSub('Aspect Ratio')
                } < /label> } <
                div className = "crop-aspect-ratio-buttons" >
                <
                div className = "crop-aspect-ratio-setting" >
                <
                button
                className = {
                    `crop-ratio-button ${cropRatio === CROP_RATIOS['1_1'] ? 'selected' : ''}`
                }
                onClick = {
                    () => {
                        this.setCropRatio('1_1');
                    }
                } >
                <
                div
                className = "aspect-ratio-box"
                style = {
                    {
                        width: `16px`,
                        height: `16px`,
                    }
                }
                /> <
                /button> <
                label > {
                    '1x1'
                } < /label> <
                /div>

                <
                div className = "crop-aspect-ratio-setting" >
                <
                button
                className = {
                    `crop-ratio-button ${cropRatio === CROP_RATIOS['4_3'] ? 'selected' : ''}`
                }
                onClick = {
                    () => {
                        this.setCropRatio('4_3');
                    }
                } >
                <
                div
                className = "aspect-ratio-box"
                style = {
                    {
                        width: `16px`,
                        height: `12px`,
                    }
                }
                /> <
                /button> <
                label > {
                    '4x3'
                } < /label> <
                /div>

                <
                div className = "crop-aspect-ratio-setting" >
                <
                button
                className = {
                    `crop-ratio-button ${cropRatio === CROP_RATIOS['16_9'] ? 'selected' : ''}`
                }
                onClick = {
                    () => {
                        this.setCropRatio('16_9');
                    }
                } >
                <
                div
                className = "aspect-ratio-box"
                style = {
                    {
                        width: `16px`,
                        height: `9px`,
                    }
                }
                /> <
                /button> <
                label > {
                    '16x9'
                } < /label> <
                /div>

                <
                div className = "crop-aspect-ratio-setting" >
                <
                button
                className = {
                    `crop-ratio-button ${cropRatio === CROP_RATIOS['2_1'] ? 'selected' : ''}`
                }
                onClick = {
                    () => {
                        this.setCropRatio('2_1');
                    }
                } >
                <
                div
                className = "aspect-ratio-box"
                style = {
                    {
                        width: `16px`,
                        height: `8px`,
                    }
                }
                /> <
                /button> <
                label > {
                    '2x1'
                } < /label> <
                /div> <
                /div> <
                /div>
            );
        }

        renderCropDimensionSettings() {
            const gettextSub = this.context.gtService.gettextSub;
            const {
                cropCoords
            } = this.props.cropData;

            return ( <
                div className = "crop-tools" >
                <
                div className = "tools-row" >
                <
                div className = "crop-dim-setting" >
                <
                label
                for = 'crop-x-offset' > {
                    gettextSub('X axis')
                } < /label> <
                input type = 'number'
                min = '0'
                max = '100000'
                className = "crop-x-offset-selector"
                name = 'crop-x-offset'
                // onInput={this.handleSetCropDims} // TODO allow input?
                onKeyDown = {
                    this.handleCropDimsKeyDown
                }
                value = {
                    cropCoords[0][0]
                }
                /> <
                /div> <
                div className = "crop-dim-setting" >
                <
                label
                for = 'crop-y-offset' > {
                    gettextSub('Y axis')
                } < /label> <
                input type = 'number'
                min = '0'
                max = '100000'
                className = "crop-y-offset-selector"
                name = 'crop-y-offset'
                // onInput={this.handleSetCropDims} // TODO allow input?
                onKeyDown = {
                    this.handleCropDimsKeyDown
                }
                value = {
                    cropCoords[0][1]
                }
                /> <
                /div> <
                /div>

                <
                div className = "tools-row" >
                <
                div className = "crop-dim-setting" >
                <
                label
                for = 'crop-width' > {
                    gettextSub('Width')
                } < /label> <
                input type = 'number'
                min = '0'
                max = '100000'
                className = "crop-width-selector"
                name = 'crop-width'
                // onInput={this.handleSetCropDims} // TODO allow input?
                onKeyDown = {
                    this.handleCropDimsKeyDown
                }
                value = {
                    cropCoords[1][0] - cropCoords[0][0]
                }
                /> <
                /div>

                <
                div className = "crop-dim-setting" >
                <
                label
                for = 'crop-height' > {
                    gettextSub('Height')
                } < /label> <
                input type = 'number'
                min = '0'
                max = '100000'
                className = "crop-width-selector"
                name = 'crop-height'
                // onInput={this.handleSetCropDims} // TODO allow input?
                onKeyDown = {
                    this.handleCropDimsKeyDown
                }
                value = {
                    cropCoords[1][1] - cropCoords[0][1]
                }
                /> <
                /div> <
                /div> <
                /div>
            );
        }

        renderHeader() {
            const gettextSub = this.context.gtService.gettextSub;
            return ( <
                div className = "section-header" >
                <
                h2 > {
                    gettextSub('Crop')
                } < /h2> <
                p > {
                    gettextSub('Make it yours to share with your friends')
                } < /p> <
                /div>
            );
        }

        render() {
            if (!this.props.cropData.cropCoords) {
                return <div > < /div>;
            }
            return ( <
                div className = "CroppingTools" > {!this.props.isMobile && this.renderHeader()
                } {
                    !this.props.isMobile && this.renderCropDimensionSettings()
                } {
                    this.renderAspectRatioButtons()
                } <
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
        tool: ['ui.GifEditor.tool'],
        editorBoundingRect: ['ui.GifEditor.editorBoundingRect'],
        editor: ['ui.GifEditor.editor'],
    })
    export class CropGrid extends CustomComponent {
        constructor(props, context) {
            super(props, context);

            this.state = {
                cropTarget: undefined,
            };
        }

        componentDidUpdate(prevProps) {
            if (prevProps.editorBoundingRect !== this.props.editorBoundingRect) {
                this.resetCropCoordsIfOutOfBounds(); // TODO should we instead track when window is resized and then reset cropCoords?
            }
            if (prevProps.cropData.cropRatio !== this.props.cropData.cropRatio) {
                this.setCropCordsToCropRatio();
            }!this.props.cropData.cropCoords && this.setDefaultCropCoords();
        }

        updateCropData(data) {
            const cropCoords = data.cropCoords;
            if (cropCoords) { // NOTE we don't want decimal values for coordinates
                data.cropCoords = [
                    [Math.floor(cropCoords[0][0]), Math.floor(cropCoords[0][1])],
                    [Math.floor(cropCoords[1][0]), Math.floor(cropCoords[1][1])],
                ];
            }
            const cropData = this.props.cropData;
            this.context.store.set('ui.GifEditor.cropData', Object.assign({}, cropData, data));
        }

        resetCropCoordsIfOutOfBounds() {
            // TODO this wasn't working properly -- need to rethink
            // Ideally this will only happen if the gif changes size due to page resize.
            // That will cause the crop coords to be innacuratte.
            // Maybe only fire when imagePanelBoundingRect changes?
            // if (this.isOutOfBounds()) {
            //     this.props.editor.resetCropCoords();
            // }
        }

        // TODO refactor to include all crop boundary checking (and caption boundary checking?)
        isOutOfBounds(dimension) {
            const coords = this.props.cropData.cropCoords;
            const bounds = [
                [0, 0],
                [this.props.editorBoundingRect.width, this.props.editorBoundingRect.height]
            ];

            if (!coords) {
                return false;
            }
            if ((dimension === 'left' || !dimension) && coords[0][0] < bounds[0][0]) {
                return true;
            }
            if ((dimension === 'right' || !dimension) && coords[1][0] > bounds[1][0]) {
                return true;
            }
            if ((dimension === 'top' || !dimension) && coords[0][1] < bounds[0][1]) {
                return true;
            }
            if ((dimension === 'bottom' || !dimension) && coords[1][1] > bounds[1][1]) {
                return true;
            }

            return false;
        }

        setCropCordsToCropRatio() {
            const ratio = this.props.cropData.cropRatio;
            if (ratio) {
                this.setDefaultCropCoords(ratio);
            }
        }

        setDefaultCropCoords(ratio) {
            let cropCoords;
            const width = this.props.editorBoundingRect.width;
            const height = this.props.editorBoundingRect.height;
            const margin = .25;

            if (ratio) {
                if (width / height > ratio) {
                    cropCoords = [
                        [(width - ((1 - 2 * margin) * height * ratio)) / 2, margin * height],
                        [(width + ((1 - 2 * margin) * height * ratio)) / 2, (1 - margin) * height],
                    ];
                } else {
                    cropCoords = [
                        [margin * width, (height - ((1 - 2 * margin) * width / ratio)) / 2],
                        [(1 - margin) * width, (height + ((1 - 2 * margin) * width / ratio)) / 2],
                    ];
                }
            } else {
                cropCoords = [
                    [0, 0],
                    [width, height]
                ];
            }

            this.updateCropData({
                cropCoords
            });
        }

        @autobind
        setCropToolElement(element) {
            this.cropTool = element;
        }

        @autobind
        startResize(e) {
            e.preventDefault();
            e.stopPropagation();
            this.props.editor.updateToolTrackingState('crop', {
                actions: 'ui'
            });
            let clientX;
            let clientY;
            if (e.type.slice(0, 5) === 'mouse') {
                document.addEventListener('mouseup', this.stopResize);
                document.addEventListener('mousemove', this.redrawCrop);
                clientX = e.clientX;
                clientY = e.clientY;
            } else if (e.type.slice(0, 5) === 'touch') {
                document.addEventListener('touchend', this.stopResize);
                document.addEventListener('touchmove', this.redrawCrop);
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            }
            let cropTarget;
            const {
                cropCoords
            } = this.props.cropData;

            switch (e.target.className) {
                case 'crop-area':
                    this.cropDragOffset = [
                        clientX - this.props.editorBoundingRect.left - cropCoords[0][0],
                        clientY - this.props.editorBoundingRect.top - cropCoords[0][1],
                    ];
                    this.cropBoxWidth = cropCoords[1][0] - cropCoords[0][0];
                    this.cropBoxHeight = cropCoords[1][1] - cropCoords[0][1];
                    cropTarget = 'drag';
                    break;
                case 'crop-corner-nw':
                    cropTarget = 'NW';
                    break;
                case 'crop-corner-sw':
                    cropTarget = 'SW';
                    break;
                case 'crop-corner-ne':
                    cropTarget = 'NE';
                    break;
                case 'crop-corner-se':
                    cropTarget = 'SE';
                    break;
            }
            this.setState({
                cropTarget,
            });
        }

        @autobind
        stopResize(e) {
            if (e.type.slice(0, 5) === 'mouse') {
                document.removeEventListener('mousemove', this.redrawCrop);
                document.removeEventListener('mouseup', this.stopResize);
            } else if (e.type.slice(0, 5) === 'touch') {
                document.removeEventListener('touchmove', this.redrawCrop);
                document.removeEventListener('touchend', this.stopResize);
            }
        }

        @autobind
        redrawCrop(e) { // eslint-disable-line complexity
            let clientX;
            let clientY;
            if (e.type.slice(0, 5) === 'mouse') {
                clientX = e.clientX;
                clientY = e.clientY;
            } else if (e.type.slice(0, 5) === 'touch') {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            }

            let cropCoords = clone(this.props.cropData.cropCoords);
            let x = clientX - this.props.editorBoundingRect.left;
            let y = clientY - this.props.editorBoundingRect.top;
            const bounds = [
                [0, 0],
                [this.props.editorBoundingRect.width, this.props.editorBoundingRect.height]
            ];
            const minCropDim = 50;

            if (this.state.cropTarget.includes('W')) {
                if (x < bounds[0][0]) {
                    x = bounds[0][0];
                } else if (x > cropCoords[1][0] - minCropDim) {
                    x = cropCoords[1][0] - minCropDim;
                }
            }
            if (this.state.cropTarget.includes('E')) {
                if (x > bounds[1][0]) {
                    x = bounds[1][0];
                } else if (x < cropCoords[0][0] + minCropDim) {
                    x = cropCoords[0][0] + minCropDim;
                }
            }
            if (this.state.cropTarget.includes('N')) {
                if (y < bounds[0][1]) {
                    y = bounds[0][1];
                } else if (y > cropCoords[1][1] - minCropDim) {
                    y = cropCoords[1][1] - minCropDim;
                }
            }
            if (this.state.cropTarget.includes('S')) {
                if (y > bounds[1][1]) {
                    y = bounds[1][1];
                } else if (y < cropCoords[0][1] + minCropDim) {
                    y = cropCoords[0][1] + minCropDim;
                }
            }

            const {
                cropRatio
            } = this.props.cropData;
            switch (this.state.cropTarget) {
                case 'NW':
                    if (cropRatio) {
                        const width = cropCoords[1][0] - x;
                        const height = cropCoords[1][1] - y;
                        if (width / height > cropRatio) {
                            x = cropCoords[1][0] - (height * cropRatio);
                        } else {
                            y = cropCoords[1][1] - (width / cropRatio);
                        }
                    }
                    cropCoords[0] = [x, y];
                    break;
                case 'SE':
                    if (cropRatio) {
                        const width = x - cropCoords[0][0];
                        const height = y - cropCoords[0][1];
                        if (width / height > cropRatio) {
                            x = cropCoords[0][0] + (height * cropRatio);
                        } else {
                            y = cropCoords[0][1] + (width / cropRatio);
                        }
                    }
                    cropCoords[1] = [x, y];
                    break;
                case 'NE':
                    if (cropRatio) {
                        const width = x - cropCoords[0][0];
                        const height = cropCoords[1][1] - y;
                        if (width / height > cropRatio) {
                            x = cropCoords[0][0] + (height * cropRatio);
                        } else {
                            y = cropCoords[1][1] - (width / cropRatio);
                        }
                    }
                    cropCoords[1][0] = x;
                    cropCoords[0][1] = y;
                    break;
                case 'SW':
                    if (cropRatio) {
                        const width = cropCoords[1][0] - x;
                        const height = y - cropCoords[0][1];
                        if (width / height > cropRatio) {
                            x = cropCoords[1][0] - (height * cropRatio);
                        } else {
                            y = cropCoords[0][1] + (width / cropRatio);
                        }
                    }
                    cropCoords[0][0] = x;
                    cropCoords[1][1] = y;
                    break;
                case 'drag':
                    {
                        let leftX = x - this.cropDragOffset[0];
                        let rightX = leftX + this.cropBoxWidth;
                        let topY = y - this.cropDragOffset[1];
                        let bottomY = topY + this.cropBoxHeight;

                        if (leftX < 0) {
                            leftX = 0;
                            rightX = this.cropBoxWidth;
                        } else if (rightX > this.props.editorBoundingRect.width) {
                            leftX = this.props.editorBoundingRect.width - this.cropBoxWidth;
                            rightX = this.props.editorBoundingRect.width;
                        }

                        if (topY < 0) {
                            topY = 0;
                            bottomY = this.cropBoxHeight;
                        } else if (bottomY > this.props.editorBoundingRect.height) {
                            topY = this.props.editorBoundingRect.height - this.cropBoxHeight;
                            bottomY = this.props.editorBoundingRect.height;
                        }
                        cropCoords = [
                            [leftX, topY],
                            [rightX, bottomY]
                        ];

                        break;
                    }
            }

            this.updateCropData({
                cropCoords
            });
        }

        render() {
            const {
                cropCoords
            } = this.props.cropData;
            if (!cropCoords) {
                this.setDefaultCropCoords();
                return <div > < /div>;
            }
            const width = cropCoords[1][0] - cropCoords[0][0];
            const height = cropCoords[1][1] - cropCoords[0][1];
            const innerGridBorderWidth = .5; // NOTE width of the crop grid border
            const editorHeight = this.props.editorBoundingRect.height;
            const editorWidth = this.props.editorBoundingRect.width;

            return ( <
                div className = {
                    `CropGrid`
                }
                style = {
                    {
                        height: `${editorHeight + 12}px`,
                        width: `${editorWidth + 12}px`,
                        top: `-6px`,
                        left: `-6px`,
                    }
                } >
                <
                div className = "crop-grid-wrapper"
                style = {
                    {
                        height: `${editorHeight + 6}px`,
                        width: `${editorWidth + 6}px`,
                        top: `4px`,
                        left: `4px`,
                    }
                } >
                <
                div id = "cropTool"
                ref = {
                    this.setCropToolElement
                }
                className = "crop-area"
                style = {
                    {
                        left: `${cropCoords[0][0]}px`,
                        top: `${cropCoords[0][1]}px`,
                        width: `${width}px`,
                        height: `${height}px`,
                    }
                }
                onMouseDown = {
                    this.startResize
                }
                onTouchStart = {
                    this.startResize
                } >
                <
                div className = "grid-1"
                style = {
                    {
                        width: `${((width - 2 * innerGridBorderWidth) / 3)}px`,
                        borderLeftWidth: `${innerGridBorderWidth}px`,
                        borderRightWidth: `${innerGridBorderWidth}px`,
                    }
                }
                /> <
                div className = "grid-2"
                style = {
                    {
                        height: `${((height - 2 * innerGridBorderWidth) / 3)}px`,
                        borderTopWidth: `${innerGridBorderWidth}px`,
                        borderBottomWidth: `${innerGridBorderWidth}px`,
                    }
                }
                /> <
                div className = "crop-corner-nw"
                onMouseDown = {
                    this.startResize
                }
                onTouchStart = {
                    this.startResize
                } >
                < div > < /div></div >
                <
                div className = "crop-corner-ne"
                onMouseDown = {
                    this.startResize
                }
                onTouchStart = {
                    this.startResize
                } >
                < div > < /div></div >
                <
                div className = "crop-corner-sw"
                onMouseDown = {
                    this.startResize
                }
                onTouchStart = {
                    this.startResize
                } >
                < div > < /div></div >
                <
                div className = "crop-corner-se"
                onMouseDown = {
                    this.startResize
                }
                onTouchStart = {
                    this.startResize
                } >
                < div > < /div></div >
                <
                /div> <
                /div> <
                /div>
            );
        }
    }