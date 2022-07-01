import {
    autobind
} from 'core-decorators';

import {
    Component
} from 'inferno'; // eslint-disable-line no-unused-vars

import emitter from 'tiny-emitter/instance';

import {
    Link,
    CustomComponent
} from '../../common/components';
import {
    isMobile,
    iOS
} from '../../common/util';

import './UpsellPill.scss';


const timesClosed = {};

export class UpsellPill extends CustomComponent {
    constructor(props, context) {
        super(props, context);
        this.state = {
            hide: false,
            bottom: 0,
            amplioCount: 0
        };
        this.animationOpenStyle = {
            animation: `slideInUp 300ms ease 300ms both`,
            WebkitAnimation: `slideInUp 300ms ease 300ms both`,
        };
        this.animationCloseStyle = {
            animation: `slideOutDown 300ms ease 0ms both`,
            WebkitAnimation: `slideOutDown 300ms ease 0ms both`,
        };
        this.origin = this.props.origin || 'undefined';
        this.disabled = !(isMobile() && iOS());
    }
    componentWillUnmount() {
        this.el && this.el.removeEventListener('animationend', this.animationEnd);
        document.removeEventListener('scroll', this.ensureComponentFixedToBottom);
        emitter.off('amplioCacheModified', this.handleAmplioCacheModified);
    }
    componentDidMount() {
        if (!this.disabled) {
            this.setState({
                open: true
            });
            document.addEventListener('scroll', this.ensureComponentFixedToBottom);
            emitter.on('amplioCacheModified', this.handleAmplioCacheModified);
        }
    }

    @autobind
    handleAmplioCacheModified({
        count
    }) {
        this.setState({
            amplioCount: count
        });
    }

    /* NOTE: When the iOS smart app banner (providing deep linking to our app) is
    visible, it pushes the viewport below the bottom of a device's screen thereby
    obscuring the upsell which has a fixed bottom positioning. In order to ensure
    that the upsell remains fixed to the bottom of the screen at all times we need
    to dynamically adjust the bottom offset. */
    @autobind
    ensureComponentFixedToBottom() {
        const clientHeight = document.documentElement.clientHeight;
        const windowInnerHeight = window.innerHeight;

        if (clientHeight > windowInnerHeight) {
            this.setState({
                bottom: clientHeight - windowInnerHeight
            });
        } else if (this.state.bottom !== 0) {
            this.setState({
                bottom: 0
            });
        }
    }

    @autobind
    hide(event) {
        if (this.state.closing) {
            return;
        }
        this.state.closing = true;
        // NOTE using an event listener resolves some timing issues on ios
        this.el && this.el.addEventListener('animationend', this.animationEnd);
        document.removeEventListener('scroll', this.ensureComponentFixedToBottom);
        this.triggerUpdate();
    }
    @autobind
    animationEnd() {
        timesClosed[this.origin] = timesClosed[this.origin] ? ++timesClosed[this.origin] : 1;
        this.state.hide = true;
        this.triggerUpdate();
    }
    @autobind
    setElement(el) {
        this.el = el;
    }
    render() {
        if (this.disabled) {
            return;
        }

        const gettextSub = this.context.gtService.gettextSub;
        const to = this.props.to || 'https://itunes.apple.com/app/apple-store/id917932200?pt=39040802&ct=BPPV2&mt=8';
        const text = this.props.text || gettextSub('Share from GIF Keyboard');
        const show = (!this.state.hide && !timesClosed[this.origin]) && this.state.amplioCount === 0;
        const bottomFixStyle = {
            bottom: `${this.state.bottom}px`
        };
        const animationStyle = this.state.closing ? this.animationCloseStyle : this.state.open ? this.animationOpenStyle : {};
        const style = Object.assign({}, animationStyle, bottomFixStyle);

        return ( <
            div className = {
                `UpsellPill${show ? '' : ' hidden'}`
            }
            style = {
                style
            }
            ref = {
                this.setElement
            } >
            <
            div className = "content" >
            <
            div className = "image icon-messages" / >
            <
            div className = "image icon-gif" / >

            <
            p > The best experience is in the app! < /p>

            <
            Link className = "cta"
            to = {
                to
            }
            blank = {
                false
            } > { /* NOTE: in some cases, link won't open to ios App Store unless blank=false*/ } {
                text
            } <
            /Link>

            <
            button className = "closeBtn"
            onClick = {
                this.hide
            } > {
                '\u2715'
            } < /button> <
            /div> <
            /div>
        );
    }
}