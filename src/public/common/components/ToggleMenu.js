import {
    autobind
} from 'core-decorators';

import {
    Component
} from 'inferno'; // eslint-disable-line no-unused-vars

import {
    window
} from '../../common/util';


export class ToggleMenu extends Component {
    constructor(props, context) {
        super(props, context);
        this.state = {
            active: false
        };
        this.lastEvent = null;
        this.handleNewProps(props, this.state);
    }
    componentWillUpdate(nextProps, nextState) {
        if (nextProps.menu !== this.props.menu) {
            this.handleNewProps(nextProps, nextState);
        }
    }
    handleNewProps(props, state) {
        if (props.menu.props === null) {
            props.menu.props = {};
        }
        props.menu.className = `${props.menu.className || ''} menu`;
    }
    componentDidMount() {
        window.addEventListener('click', this.deactivate);
        if (this.props.closeOnScroll) {
            window.addEventListener('scroll', this.deactivate);
        }
    }
    componentWillUnmount() {
        window.removeEventListener('click', this.deactivate);
        if (this.props.closeOnScroll) {
            window.removeEventListener('scroll', this.deactivate);
        }
    }
    @autobind
    deactivate(event) {
        if (this.lastEvent !== event) {
            this.setState({
                active: false
            });
        }
        this.lastEvent = event;
    }
    @autobind
    clickToggle(event) {
        event.stopPropagation();
        if (this.lastEvent !== event) {
            this.setState({
                active: !this.state.active
            });
        }
        this.lastEvent = event;
        if (this.props.onClick) {
            this.props.onClick(event);
        }
    }

    render() {
        let className = `${this.props.className || ''} ToggleMenu`;
        let buttonClassName = `${this.props.buttonClassName || ''} ToggleMenu-button`;
        if (this.state.active) {
            className += ' clicked active';
            buttonClassName += ' clicked active';
        }
        return ( <
            span className = {
                className
            } >
            <
            span className = {
                buttonClassName
            }
            onClick = {
                this.clickToggle
            } > {
                this.props.children
            } <
            /span> {
                this.props.menu
            } <
            /span>
        );
    }
}