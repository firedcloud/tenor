import {
    Component
} from 'inferno'; // eslint-disable-line no-unused-vars
import {
    CustomComponent
} from '../components';

import './ProgressCircle.scss';

export class ProgressCircle extends CustomComponent {
    constructor(props, context) {
        super(props, context);
        this.radius = this.props.radius - (this.props.thickness * 2);
        this.circumference = this.radius * 2 * Math.PI;
        this.transitionTime = 0;
    }

    componentDidUpdate(prevProps) {
        if (this.props.smoothing) { // Smoothing: works best when progress is linear
            if (this.props.progress !== prevProps.progress) {
                if (!this.time) {
                    this.time = Date.now();
                } else {
                    const prevTime = this.time;
                    this.time = Date.now();
                    this.transitionTime = this.time - prevTime;
                }
            }
        }
    }

    render() {
        const {
            radius,
            thickness,
            color,
            progress
        } = this.props;

        return ( <
            svg height = {
                radius * 2
            }
            width = {
                radius * 2
            } >
            <
            circle stroke = {
                color
            }
            fill = "transparent"
            strokeWidth = {
                thickness
            }
            strokeDasharray = {
                `${this.circumference} ${this.circumference}`
            }
            style = {
                {
                    strokeDashoffset: (this.circumference) - (progress * this.circumference),
                    transition: `stroke-dashoffset ${this.transitionTime}ms`,
                    transform: 'rotate(-90deg)',
                    transformOrigin: '50% 50%',
                }
            }
            stroke - width = {
                thickness
            }
            r = {
                this.radius
            }
            cx = {
                radius
            }
            cy = {
                radius
            }
            /> <
            /svg>
        );
    }
}

export class ProgressCircleIndeterminate extends CustomComponent {
    constructor(props, context) {
        super(props, context);
        this.radius = (100 * (1 - props.strokeWidthRatio)) / 2;
    }

    render() {
        const {
            diameter,
            strokeWidthRatio,
            color,
            animationDuration
        } = this.props;

        return ( <
            div className = "ProgressCircleIndeterminate"
            style = {
                {
                    height: diameter,
                    width: diameter,
                    animationDuration: `${animationDuration}ms`,
                }
            } >
            <
            svg focusable = "false"
            preserveAspectRatio = "xMidYMid meet"
            viewBox = {
                `0 0 100 100`
            }
            style = {
                {
                    width: diameter,
                    height: diameter,
                }
            } >
            <
            circle cx = "50%"
            cy = "50%"
            r = {
                this.radius
            }
            className = "ng-star-inserted"
            style = {
                {
                    animationName: `mat-progress-spinner-stroke-rotate-100`,
                    strokeDasharray: `282.743px`,
                    strokeWidth: `${strokeWidthRatio * 100}%`,
                    stroke: color,
                }
            } >
            < /circle> <
            /svg> <
            /div>
        );
    }
}