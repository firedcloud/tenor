import {
    autobind
} from 'core-decorators';

import {
    Component
} from 'inferno'; // eslint-disable-line no-unused-vars

import {
    CustomComponent,
    Link
} from '../../common/components';
import {
    SearchBar
} from './SearchBar';
import {
    document,
    window,
    isMobile
} from '../../common/util';

import './TopSearchBar.scss';


export class TopBar extends CustomComponent {
    constructor(props, context) {
        super(props, context);
        this.state.fixedTop = false;
        if (document.documentElement || document.body) {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
            if (scrollTop > 50) {
                this.state.fixedTop = true;
            }
        }
    }

    componentDidMount() {
        window.addEventListener('resize', this.setFixedTop);
        window.addEventListener('scroll', this.setFixedTop);
    }
    componentWillUnmount() {
        window.removeEventListener('resize', this.setFixedTop);
        window.removeEventListener('scroll', this.setFixedTop);
    }

    @autobind
    setFixedTop() {
        if (isMobile() && this.props.preventMobileSticky) {
            this.state.fixedTop = false;
            this.triggerUpdate();
            return;
        }
        if (document.documentElement || document.body) {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
            if (!this.state.fixedTop && scrollTop > 50) {
                this.state.fixedTop = true;
                this.triggerUpdate();
            }
            if (this.state.fixedTop && scrollTop <= 50) {
                this.state.fixedTop = false;
                this.triggerUpdate();
            }
        }
    }

    render() {
        const {
            fixedTop
        } = this.state;
        return ( <
            div className = {
                `TopBarComponent ${this.props.className}`
            } >
            <
            div className = {
                `TopBar${fixedTop ? ' fixed-top' : ''}`
            } > {
                this.props.children
            } <
            /div> <
            /div>
        );
    }
}

export class TopSearchBar extends CustomComponent {
    render() {
        return ( <
            TopBar className = "TopSearchBar" >
            <
            div className = "container" >
            <
            Link to = "/"
            className = "navbar-brand"
            itemprop = "url" >
            <
            img src = "/assets/img/tenor-logo-white.svg"
            width = "80"
            height = "22"
            alt = "Tenor"
            itemprop = "logo" / >
            <
            /Link> <
            div className = "search-bar-wrapper" > < SearchBar / > < /div> <
            /div> <
            /TopBar>
        );
    }
}