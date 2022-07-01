import {
    autobind
} from 'core-decorators';

import emitter from 'tiny-emitter/instance';

import {
    Component
} from 'inferno'; // eslint-disable-line no-unused-vars

import {
    CustomComponent,
    Link
} from '../../common/components';
import {
    Icon
} from '../../common/components/Icon';
import {
    ToggleMenu
} from '../../common/components/ToggleMenu';
import dialog from '../../common/dialog';
import authService from '../../common/services/authService';

import {
    NotificationIcon
} from './NotificationIcon';

import './NavBar.scss';
require('~/assets/scss/transformicons.scss');


export class NavMenu extends CustomComponent {
    constructor(props, context) {
        super(props, context);
        this.state.exploreData = null;
    }

    render() {
        const gettextSub = this.context.gtService.gettextSub;
        const localizeUrlPath = this.context.gtService.localizeUrlPath;

        return ( <
            div className = "animated NavMenu" >
            <
            div className = "menu-section" >
            <
            div className = "menu-header" > {
                gettextSub('Products')
            } < /div> <
            ul className = "list-unstyled" >
            <
            li className = "menu-item" > < Link to = "https://apps.apple.com/app/apple-store/id917932200?pt=39040802&ct=NavGifKeyboard&mt=8"
            external = {
                true
            } > {
                gettextSub('GIF Keyboard')
            } < /Link></li >
            <
            li className = "menu-item" > < Link to = "https://play.google.com/store/apps/details?id=com.riffsy.FBMGIFApp"
            external = {
                true
            } > {
                gettextSub('Android')
            } < /Link></li >
            <
            li className = "menu-item" > < Link to = {
                localizeUrlPath('/mac')
            } > {
                gettextSub('Mac')
            } < /Link></li >
            <
            li className = "menu-item" > < Link to = {
                localizeUrlPath('/contentpartners')
            } > {
                gettextSub('Content Partners')
            } < /Link></li >
            <
            /ul> <
            /div> <
            div className = "menu-section" >
            <
            div className = "menu-header" > {
                gettextSub('Explore')
            } < /div> <
            ul className = "list-unstyled" >
            <
            li className = "menu-item" > < Link to = {
                localizeUrlPath('/reactions')
            } > {
                gettextSub('Reaction GIFs')
            } < /Link></li >
            <
            li className = "menu-item" > < Link to = {
                localizeUrlPath('/explore')
            } > {
                gettextSub('Explore GIFs')
            } < /Link></li >
            <
            /ul> <
            /div> <
            div className = "menu-section" >
            <
            div className = "menu-header" > {
                gettextSub('Company')
            } < /div> <
            ul className = "list-unstyled" >
            <
            li className = "menu-item" >
            <
            Link to = {
                localizeUrlPath('/about-us')
            } > {
                gettextSub('About')
            } < /Link> <
            /li> <
            li className = "menu-item" >
            <
            Link to = {
                localizeUrlPath('/press')
            } > {
                gettextSub('Press')
            } < /Link> <
            /li> <
            li className = "menu-item" >
            <
            Link to = "https://blog.tenor.com/"
            external = {
                true
            } > {
                gettextSub('Blog')
            } < /Link> <
            /li> <
            li className = "menu-item" >
            <
            Link to = 'https://support.google.com/tenor'
            external = {
                true
            } > {
                gettextSub('FAQ')
            } < /Link> <
            /li> <
            li className = "menu-item" >
            <
            Link to = {
                localizeUrlPath('/legal-terms')
            } > {
                gettextSub('Terms and Privacy')
            } < /Link> <
            /li> <
            li className = "menu-item" >
            <
            Link to = "/assets/dist/licenses.txt"
            external = {
                true
            } > {
                gettextSub('Website Licenses')
            } < /Link> <
            /li> <
            li className = "menu-item" >
            <
            Link to = {
                localizeUrlPath('/contact')
            } > {
                gettextSub('Contact Us')
            } < /Link> <
            /li> <
            /ul> <
            /div> <
            div className = "menu-section" >
            <
            div className = "menu-header" > {
                gettextSub('API')
            } < /div> <
            ul className = "list-unstyled" >
            <
            li className = "menu-item" > < Link to = "/gifapi"
            external = {
                true
            } > {
                gettextSub('Tenor GIF API')
            } < /Link></li >
            <
            li className = "menu-item" > < Link to = "https://developers.google.com/tenor/guides/endpoints"
            external = {
                true
            } > {
                gettextSub('GIF API Documentation')
            } < /Link></li >
            <
            li className = "menu-item" > < Link to = "/gifapi/unity-ar-gif-sdk"
            external = {
                true
            } > {
                gettextSub('Unity AR SDK')
            } < /Link></li >
            <
            /ul> <
            /div> <
            /div>
        );
    }
}


export class NavBar extends CustomComponent {
    constructor(props, context) {
        super(props, context);
        // will be false on server, we need our markup to match initially
        this.state.loggedIn = false;

        if (process.env.BROWSER) {
            this.handleAuthDataSet();
        }
        this.createButtonTest = context.arianeMultivariateGroupSelect({
            control: false,
            1: true,
            2: true,
            3: true,
            4: true,
            5: true,
            6: true,
            7: true,
            8: true,
            9: true,
            10: true,
        });
    }
    componentDidMount() {
        emitter.on('authDataSet', this.handleAuthDataSet);
        emitter.on('finish-progress-bar', authService.showAccountLinkingDialogAfterTimeoutPeriod);
    }
    componentWillUnmount() {
        emitter.off('authDataSet', this.handleAuthDataSet);
        emitter.off('finish-progress-bar', authService.showAccountLinkingDialogAfterTimeoutPeriod);
    }
    @autobind
    handleAuthDataSet() {
        this.state.loggedIn = authService.isLoggedIn();
        this.triggerUpdate();
    }
    showEditProfileDialog() {
        dialog.open('edit-profile-dialog');
    }
    @autobind
    logout() {
        authService.logout(this.context.apiService);
    }
    @autobind
    showLoginDialog() {
        this.context.apiService.registerEvent('signin_button_tap', {});
        authService.showLoginDialog();
    }
    render() {
            const gettextSub = this.context.gtService.gettextSub;
            const localizeUrlPath = this.context.gtService.localizeUrlPath;
            const isGifMakerPage = this.context.router.route.location.pathname === '/gif-maker';

            const loggedIn = this.state.loggedIn;
            let loggedInMenu = null;
            if (loggedIn) {
                loggedInMenu = ( < ToggleMenu className = "navbar-icon profile"
                        menu = { <
                            div className = "animated" >
                            <
                            Link className = "item"
                            to = {
                                this.linkToProfile()
                            } >
                            <
                            div className = "username" > {
                                authService.getUsername()
                            } <
                            /div> <
                            div className = "subheading" > {
                                gettextSub('view profile')
                            } <
                            /div> <
                            /Link> {
                                authService.userHasFlag('developer') &&
                                    <
                                    Link className = "item"
                                to = "/developer/dashboard"
                                external = {
                                        true
                                    } > {
                                        gettextSub('Developer Dashboard')
                                    } <
                                    /Link>
                            } <
                            Link className = "item edit-page"
                            onClick = {
                                this.showEditProfileDialog
                            } > {
                                gettextSub('Edit Profile')
                            } <
                            /Link> {
                                !authService.hasLinkedAccount() &&
                                    <
                                    Link className = "item"
                                onClick = {
                                        () => authService.showAccountLinkingDialog({
                                            userSelected: true
                                        })
                                    } > {
                                        gettextSub('Link Account')
                                    } <
                                    /Link>
                            } <
                            Link className = "item"
                            onClick = {
                                this.logout
                            } > {
                                gettextSub('Log out')
                            } <
                            /Link> <
                            /div>}> <
                            Icon name = "profile-icon" / >
                            <
                            /ToggleMenu>);
                        }

                        return ( <
                            nav className = {
                                `NavBar ${isGifMakerPage ? 'blue-box-shadow' : ''}`
                            } >
                            <
                            div className = "container" >
                            <
                            span itemscope = {
                                true
                            }
                            itemtype = "http://schema.org/Organization" >
                            <
                            Link to = {
                                localizeUrlPath('/')
                            }
                            className = "navbar-brand"
                            itemprop = "url" >
                            <
                            img src = "/assets/img/tenor-logo.svg"
                            width = "80"
                            height = "22"
                            alt = "Tenor"
                            itemprop = "logo" / >
                            <
                            /Link> <
                            /span> <
                            div className = "nav-buttons" > {
                                process.env.BROWSER && < div className = "account-buttons" > {!isGifMakerPage &&
                                    <
                                    Link
                                    to = {
                                        '/gif-maker?utm_source=nav-bar&utm_medium=internal&utm_campaign=gif-maker-entrypoints'
                                    }
                                    className = "button upload-button"
                                    clickLabel = {
                                        `navbar-upload-button`
                                    } >
                                    <
                                    img src = '/assets/icons/upload-icon.svg' / > {
                                        this.createButtonTest ?
                                        gettextSub('Create') : gettextSub('Upload')
                                    } <
                                    /Link>
                                } {
                                    loggedIn && < NotificationIcon / >
                                } {
                                    loggedIn && loggedInMenu
                                }

                                {
                                    !loggedIn && < a className = "white-button"
                                    onClick = {
                                            this.showLoginDialog
                                        } > {
                                            gettextSub('SIGN IN')
                                        } < /a> } <
                                        /div>} <
                                        ToggleMenu buttonClassName = "menu-button navicon-button x"
                                    menu = { < NavMenu / >
                                    }
                                    closeOnScroll = {
                                            true
                                        } >
                                        <
                                        div class = "navicon" > < /div> <
                                        /ToggleMenu> <
                                        /div> <
                                        /div> <
                                        /nav>
                                );
                            }
                        }