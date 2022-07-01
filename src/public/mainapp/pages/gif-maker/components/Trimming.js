import {
    Component
} from 'inferno'; // eslint-disable-line no-unused-vars
import {
    CustomComponent
} from '../../../../common/components';
import {
    Icon
} from '../../../../common/components/Icon';
import {
    subscribe
} from '../../../../../replete';
import {
    autobind
} from 'core-decorators';
import {
    SETTINGS
} from '../constants';
import {
    KEY
} from '../../../../common/constants';
import clone from 'clone';

import './Trimming.scss';

function isValidFrameIdx({
    startIdx,
    endIdx,
    trimData,
    frames
}) {
    if (startIdx === undefined) {
        startIdx = trimData.startFrameIdx;
    }
    if (endIdx === undefined) {
        endIdx = trimData.endFrameIdx;
    }
    const frameRange = trimData.frameRange;
    if (startIdx < frameRange[0] || endIdx > frameRange[1]) {
        return false;
    }

    const time = frames[endIdx].end - frames[startIdx].start;
    if (SETTINGS.MIN_TIME && time < SETTINGS.MIN_TIME) {
        return false;
    }
    if (SETTINGS.MAX_TIME && time > SETTINGS.MAX_TIME) {
        // TODO add max length reached error response?
        return false;
    }

    return true;
}

function formatTime(time, format) {
    let ms = time % 1000;
    if (format === 'sec' && ms >= 500) {
        time += 1000 - ms;
    }
    let sec = Math.floor((time % 60000) / 1000);
    let min = Math.floor(time / 60000);

    ms = `${ms < 10 ? '0' : ''}${ms < 100 ? '0' : ''}${ms}`;
    sec = `${sec < 10 ? '0' : ''}${sec}`;
    min = `${min < 10 ? '0' : ''}${min}`;

    return `${min}:${sec}${format === 'ms' ? `.${ms}` : ''}`;
}


class PlayHead extends CustomComponent {
    componentDidUpdate(prevProps) {
        const newPlayheadOffset = this.props.playheadOffset;
        const prevPlayheadOffset = prevProps.playheadOffset;
        if (newPlayheadOffset !== prevPlayheadOffset) {
            this.restartTimeline = true;
            window.setTimeout(() => this.restartTimeline = false, 0);
        }
    }
    render() {
        const {
            playheadOffset,
            playheadContainerWidth,
            sliderEngaged,
            delay
        } = this.props;
        return <div
        className = "PlayHead time-line-container"
        style = {
                {
                    left: `${playheadOffset}px`,
                    width: `${playheadContainerWidth}px`,
                }
            } >
            <
            div
        className = {
            `time-line ${this.restartTimeline ? '' : 'reset'} ${sliderEngaged ? 'hidden' : ''}`
        }
        style = {
            {
                animationDuration: `${delay}ms`,
            }
        }
        /> <
        /div>;
    }
}

@subscribe({
    trimData: ['ui.GifEditor.trimData'],
    tool: ['ui.GifEditor.tool'],
    editor: ['ui.GifEditor.editor'],
    queueIdx: ['ui.GifMakerPage.queueIdx'],
})
export class TrimScrubber extends CustomComponent {
    constructor(props, context) {
        super(props, context);

        this.state = {
            startSliderEngaged: false,
            endSliderEngaged: false,
            sliderPositionSet: false,
        };
    }

    updateTrimData(data) {
        const trimData = this.props.trimData;
        this.context.store.set('ui.GifEditor.trimData', Object.assign({}, trimData, data));
    }

    @autobind
    handleFramesShiftStart(e) {
        const clickOutsideofSliders = e.target.className.startsWith('track-overlay-');
        if (!this.container || clickOutsideofSliders) {
            return;
        }
        this.props.editor.updateToolTrackingState('trim', {
            actions: 'ui'
        });

        this.step = this.container.offsetWidth / this.props.trimData.frameRange[1];
        if (e.type.slice(0, 5) === 'mouse') {
            this.frameShifterX = e.clientX;
            document.addEventListener('mouseup', this.stopShift);
            document.addEventListener('mousemove', this.calculateShift);
        } else if (e.type.slice(0, 5) === 'touch') {
            this.frameShifterX = e.touches[0].clientX;
            document.addEventListener('touchend', this.stopShift);
            document.addEventListener('touchmove', this.calculateShift);
        }
        this.setState({
            startSliderEngaged: true,
            endSliderEngaged: true,
        });
        this.updateTrimData({
            paused: true,
            currentFrameIdx: this.props.trimData.startFrameIdx,
        });
    }

    @autobind
    calculateShift(e) {
        let currentX;
        if (e.type.slice(0, 5) === 'mouse') {
            currentX = e.clientX;
        } else if (e.type.slice(0, 5) === 'touch') {
            currentX = e.touches[0].clientX;
        }
        const deltaX = currentX - this.frameShifterX;
        let increment = deltaX / this.step;
        increment = Math.sign(increment) * Math.floor(Math.abs(increment));
        if (increment) {
            const startFrameIdx = this.props.trimData.startFrameIdx + increment;
            const endFrameIdx = this.props.trimData.endFrameIdx + increment;
            const lowerbound = this.props.trimData.frameRange[0];
            const upperbound = this.props.trimData.frameRange[1];
            if (startFrameIdx < lowerbound || endFrameIdx > upperbound) {
                return;
            }
            this.updateTrimData({
                startFrameIdx,
                currentFrameIdx: startFrameIdx,
                endFrameIdx,
            });
            this.frameShifterX = currentX;
        }
    }

    @autobind
    stopShift(e) {
        if (e.type.slice(0, 5) === 'mouse') {
            document.removeEventListener('mouseup', this.stopShift);
            document.removeEventListener('mousemove', this.calculateShift);
        } else if (e.type.slice(0, 5) === 'touch') {
            document.removeEventListener('touchend', this.stopShift);
            document.removeEventListener('touchmove', this.calculateShift);
        }
        this.setState({
            startSliderEngaged: false,
            endSliderEngaged: false,
        });
        this.updateTrimData({
            paused: false,
        });
    }

    @autobind
    handleLeftSliderInput(e) {
        const startIdx = parseInt(e.target.value);
        const trimData = this.props.trimData;
        const frames = this.props.queue[this.props.queueIdx].frames;
        if (isValidFrameIdx({
                startIdx,
                trimData,
                frames
            })) {
            this.updateTrimData({
                paused: true,
                startFrameIdx: startIdx,
                currentFrameIdx: startIdx,
            });
        }
    }

    @autobind
    handleRightSliderInput(e) {
        const endIdx = parseInt(e.target.value);
        const trimData = this.props.trimData;
        const frames = this.props.queue[this.props.queueIdx].frames;
        if (isValidFrameIdx({
                endIdx,
                trimData,
                frames
            })) {
            this.updateTrimData({
                paused: true,
                currentFrameIdx: endIdx,
                endFrameIdx: endIdx,
            });
        }
    }

    @autobind
    handleLeftSliderEngage(e) {
        this.props.editor.updateToolTrackingState('trim', {
            actions: 'ui'
        });
        this.setState({
            startSliderEngaged: true
        });
        this.updateTrimData({
            paused: true,
            currentFrameIdx: this.props.trimData.startFrameIdx,
        });
    }
    @autobind
    handleRightSliderEngage(e) {
        this.props.editor.updateToolTrackingState('trim', {
            actions: 'ui'
        });
        this.setState({
            endSliderEngaged: true
        });
        this.updateTrimData({
            paused: true,
            currentFrameIdx: this.props.trimData.endFrameIdx,
        });
    }

    @autobind
    handleSliderDisengage(e) {
        this.setState({
            startSliderEngaged: false,
            endSliderEngaged: false,
        });
        this.updateTrimData({
            paused: false
        });
    }

    @autobind
    setContainerElement(element) {
        if (!element) {
            return;
        }
        this.container = element;
        this.triggerUpdate();
    }

    @autobind
    handlePlayButton() {
        // TODO allow play/pause? would require signicant work?
        // this.updateTrimData({
        //     paused: !this.props.trimData.paused,
        //     currentFrameIdx: this.props.trimData.currentFrameIdx,
        // });
    }


    /*
    Sets the position of the trim scrubber sliders once the editor is ready. If
    a max length for an edited gif is set, it will start the right slider at the
    appropriate frame so that MAX_TIME isn't exceeded.
    */
    setTrimSliderPosition() {
        const {
            trimData,
            queue,
            queueIdx
        } = this.props;
        const uploadObject = queue[queueIdx];
        const frames = uploadObject.frames;
        const startIdx = 0;
        let endIdx = trimData.endFrameIdx || frames.length - 1;

        while (!isValidFrameIdx({
                startIdx,
                endIdx,
                trimData,
                frames
            })) {
            endIdx--;
        }
        this.state.sliderPositionSet = true;
        this.updateTrimData({
            endFrameIdx: endIdx
        });
    }

    render() {
        const frames = this.props.queue[this.props.queueIdx].frames;
        if (!frames || this.props.tool != 'trimming') {
            return <div > < /div>;
        } else if (!this.state.sliderPositionSet) {
            this.setTrimSliderPosition();
        }
        const trimData = this.props.trimData;
        const {
            frameRange,
            startFrameIdx,
            endFrameIdx,
            currentFrameIdx
        } = trimData;

        const currentFrame = frames[currentFrameIdx];
        let leftOffset = 0;
        let rightOffset = 0;
        let playheadOffset = 0;
        let playheadContainerWidth = 10;
        const scrubberWidth = 24;
        if (this.container) {
            leftOffset = (startFrameIdx / frameRange[1]) * this.container.offsetWidth + ((frameRange[1] - startFrameIdx) / frameRange[1]) * scrubberWidth;
            rightOffset = ((frameRange[1] - endFrameIdx) / frameRange[1]) * this.container.offsetWidth + (endFrameIdx / frameRange[1]) * scrubberWidth;
            const pxPerMS = (this.container.offsetWidth - leftOffset - rightOffset) / (frames[endFrameIdx].end - frames[startFrameIdx].start);
            playheadOffset = (currentFrame.start - frames[startFrameIdx].start) * pxPerMS;
            playheadContainerWidth = currentFrame.delay * pxPerMS;
        }

        const width = frames[0].dims.width;
        const height = frames[0].dims.height;
        const frameWidth = this.container ? this.container.offsetWidth / 10 : 10;
        const frameHeight = 60;
        const canvasHeight = height;
        const canvasWidth = height * frameWidth / frameHeight;
        const xOffset = (width - canvasWidth) / 2;

        // FIXME review the sampling logic:
        const frameSamplingRate = frames.length / 10;

        const range = [
            frames[startFrameIdx].start,
            frames[endFrameIdx].end,
        ];
        const trimmedLength = formatTime(range[1] - range[0], 'sec');
        let time = frames[currentFrameIdx].start - frames[startFrameIdx].start;
        time = time - (time % 1000);
        const trimmedTime = formatTime(time, 'sec');

        const sliderEngaged = this.state.startSliderEngaged || this.state.endSliderEngaged;

        return ( <
            div className = "TrimScrubber" >
            <
            div className = "scrubber" >
            <
            div className = "frames-container"
            onMouseDown = {
                this.handleFramesShiftStart
            }
            onTouchStart = {
                this.handleFramesShiftStart
            } >
            <
            div className = "slider-track-overlay" >
            <
            div className = "track-overlay-left"
            style = {
                {
                    width: `${leftOffset}px`
                }
            }
            onClick = {
                (e) => e.stopPropagation()
            }
            /> <
            div className = "track-center" >
            <
            PlayHead playheadOffset = {
                playheadOffset
            }
            playheadContainerWidth = {
                playheadContainerWidth
            }
            sliderEngaged = {
                sliderEngaged
            }
            delay = {
                currentFrame.delay
            }
            /> <
            /div> <
            div className = "track-overlay-right"
            style = {
                {
                    width: `${rightOffset}px`
                }
            }
            onClick = {
                (e) => e.stopPropagation()
            }
            /> <
            /div> <
            div ref = {
                this.setContainerElement
            }
            className = 'frames' >
            {
                frames.filter((f, i) => {
                    return i % frameSamplingRate < 1;
                }).map((frame) => {
                    return ( <
                        canvas ref = {
                            (canvas) => {
                                if (!canvas) {
                                    return;
                                }
                                const context = canvas.getContext('2d');
                                const frameImageData = context.createImageData(width, height);
                                frameImageData.data.set(frame.imageData.data);
                                context.putImageData(
                                    frameImageData, -xOffset,
                                    0,
                                    xOffset,
                                    0,
                                    canvasWidth,
                                    canvasHeight,
                                );
                            }
                        }
                        width = {
                            canvasWidth
                        }
                        height = {
                            canvasHeight
                        }
                        />
                    );
                })
            } <
            /div> <
            /div>

            <
            div className = "trim-slider" >
            <
            input type = "range"
            min = "0"
            max = {
                frameRange[1]
            }
            value = {
                startFrameIdx
            }
            className = {
                `${this.state.startSliderEngaged ? 'trim-slider-left-engaged' : 'trim-slider-left'}`
            }
            id = "myRangeStart"
            name = "myRangeStart"
            onInput = {
                this.handleLeftSliderInput
            }
            onMouseDown = {
                this.handleLeftSliderEngage
            }
            onTouchStart = {
                this.handleLeftSliderEngage
            }
            onMouseUp = {
                this.handleSliderDisengage
            }
            onTouchEnd = {
                this.handleSliderDisengage
            }
            /> <
            input type = "range"
            min = "0"
            max = {
                frameRange[1]
            }
            value = {
                endFrameIdx
            }
            className = {
                `${this.state.endSliderEngaged ? 'trim-slider-right-engaged' : 'trim-slider-right'}`
            }
            id = "myRangeEnd"
            name = "myRangeEnd"
            onInput = {
                this.handleRightSliderInput
            }
            onMouseDown = {
                this.handleRightSliderEngage
            }
            onTouchStart = {
                this.handleRightSliderEngage
            }
            onMouseUp = {
                this.handleSliderDisengage
            }
            onTouchEnd = {
                this.handleSliderDisengage
            }
            /> <
            /div> <
            /div> <
            div className = "scrubber-details" >
            <
            Icon name = {
                this.props.trimData.paused ? 'pause-circle-outline-icon' : 'play-circle-outline-icon'
            }
            className = 'play-button'
            onClick = {
                this.handlePlayButton
            }
            /> <
            div className = "time-stamp" > {
                `${trimmedTime}/${trimmedLength} seconds`
            } <
            /div> <
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
    isMobile: ['ui.isMobile'],
    trimData: ['ui.GifEditor.trimData'],
    tool: ['ui.GifEditor.tool'],
    queueIdx: ['ui.GifMakerPage.queueIdx'],
    editor: ['ui.GifEditor.editor'],
    editorBoundingRect: ['ui.GifEditor.editorBoundingRect'],
})
export class TrimmingTools extends CustomComponent {
    constructor(props, context) {
        super(props, context);

        this.uploadObject = props.queue[props.queueIdx];
    }

    updateTrimData(data) {
        const trimData = this.props.trimData;
        this.context.store.set('ui.GifEditor.trimData', Object.assign({}, trimData, data));
    }

    @autobind
    handleTrimInputKeyDown(event) {
        let increment;
        if (event.keyCode === KEY.UP) {
            increment = 1;
        } else if (event.keyCode === KEY.DOWN) {
            increment = -1;
            // TODO: implement timestamp input?
            // } else if (event.keyCode === KEY.ENTER) {
            //     return;
        } else {
            return;
        }

        this.props.editor.updateToolTrackingState('trim', {
            actions: 'num'
        });

        const trimData = clone(this.props.trimData);
        const frames = this.uploadObject.frames;
        if (event.target.name === 'trim-start-time') {
            const startIdx = trimData.startFrameIdx + increment;
            if (isValidFrameIdx({
                    startIdx,
                    trimData,
                    frames
                })) {
                trimData['startFrameIdx'] = startIdx;
            } else {
                return;
            }
        }
        if (event.target.name === 'trim-end-time') {
            const endIdx = trimData.endFrameIdx + increment;
            if (isValidFrameIdx({
                    endIdx,
                    trimData,
                    frames
                })) {
                trimData['endFrameIdx'] = endIdx;
            } else {
                return;
            }
        }
        trimData['currentFrameIdx'] = trimData.startFrameIdx;
        trimData['paused'] = true;
        this.updateTrimData(trimData);
    }

    @autobind
    handleTrimInputKeyUp(event) {
        this.props.trimData.paused && this.updateTrimData({
            paused: false
        });
    }

    renderHeader() {
        const gettextSub = this.context.gtService.gettextSub;
        return ( <
            div className = "section-header" >
            <
            h2 > {
                gettextSub('Trim')
            } < /h2> <
            p > {
                gettextSub('Make it yours to share with your friends')
            } < /p> <
            /div>
        );
    }

    render() {
        const range = [
            this.uploadObject.frames[this.props.trimData.startFrameIdx].start,
            this.uploadObject.frames[this.props.trimData.endFrameIdx].end,
        ];
        const startTime = formatTime(range[0], 'ms');
        const endTime = formatTime(range[1], 'ms');

        return ( <
            div className = "TrimmingTools" > {!this.props.isMobile && this.renderHeader()
            } {
                !this.props.isMobile &&
                    <
                    div className = "trim-details" >
                    <
                    div className = "trim-setting" >
                    <
                    label
                for = 'trim-start-time' > Start < /label> <
                    input
                name = 'trim-start-time'
                type = 'text'
                value = {
                    startTime
                }
                onKeyDown = {
                    this.handleTrimInputKeyDown
                }
                onKeyUp = {
                    this.handleTrimInputKeyUp
                }
                /> <
                /div> <
                div className = "trim-setting" >
                    <
                    label
                for = 'trim-end-time' > End < /label> <
                    input
                name = 'trim-end-time'
                type = 'text'
                value = {
                    endTime
                }
                onKeyDown = {
                    this.handleTrimInputKeyDown
                }
                onKeyUp = {
                    this.handleTrimInputKeyUp
                }
                /> <
                /div> <
                /div>
            } {
                this.props.isMobile && frames &&
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
            /div>
        );
    }
}