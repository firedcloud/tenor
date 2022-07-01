import ClipboardJS from 'clipboard';
import {
    autobind
} from 'core-decorators';
import LiteURL from 'lite-url';

import emitter from 'tiny-emitter/instance';

import {
    Component
} from 'inferno'; // eslint-disable-line no-unused-vars
import {
    Link as InfernoLink
} from 'inferno-router';

import {
    CONSTANTS
} from './config';
import {
    Metadata
} from './metadata';
import authService from './services/authService';
import {
    cleanTermsForURL,
    document,
    fullURL,
    getV1PostId,
    isMobile,
    localURL,
    removeEmptyStrings,
    window
} from './util';
import dialog from './dialog';

import rootScope from '../mainapp/services/rootScope';


export class Link extends Component {
    constructor(props, context) {
        super(props, context);
        if (props.to) {
            props.to = props.to.trim();
        }
    }
    componentDidMount() {
        // have to use intervals since Inferno swallows the hashchange/popstate
        // events, but doesn't re-expose them via history events.
        this.routerInterval = window.setInterval(this.routerHandler, 500);
    }
    componentWillUnmount() {
        window.clearInterval(this.routerInterval);
    }
    componentWillUpdate(nextProps, state) {
        if (nextProps.to) {
            nextProps.to = nextProps.to.trim();
        }
    }
    @autobind
    routerHandler() {
        if (this.props.to && this.props.to.startsWith('#')) {
            this.setState({
                foo: new Date()
            });
        }
    }

    @autobind
    handleClick(event) {
        const isHash = this.props.to && this.props.to.startsWith('#');
        if (isHash) {
            const id = this.props.to.substr(1);
            let scrollSpeed = 'smooth';
            if (this.props.animateScroll === false) {
                event.preventDefault();
                event.stopPropagation();
                scrollSpeed = 'instant';
            }
            window.setTimeout(function() {
                document.getElementById(id).scrollIntoView({
                    behavior: scrollSpeed,
                    block: 'start',
                });
            }, 0);
        }

        if (this.originalOnClick) {
            this.originalOnClick(event);
        }
        const to = this.props.to;
        if (!to) {
            // Don't track click with no URL.
            return;
        }
        // We don't want to track "external" links to the same domain as being
        // outbound.
        if (to.charAt(0) !== '/' && to.charAt(0) !== '#') {
            window.ga('send', 'event', 'outbound', 'click', to, {
                'transport': 'beacon',
            });
        }
        if (this.props.clickLabel) {
            window.ga('send', 'event', 'link', 'click', this.props.clickLabel, {
                'transport': 'beacon',
            });
        }
        if (to.substr(0, 15) === 'riffsykeyboard:') {
            // If the page is still visible after a timeout, redirect to app store.
            // TODO: log these users
            setTimeout(function() {
                if (!document.hidden) {
                    window.location.href = 'https://itunes.apple.com/app/apple-store/id917932200?pt=39040802&ct=Packs%20Promotion&mt=8';
                }
            }, 3000);
        }
    }

    render() {
        let {
            onClick,
            external,
            blank,
            disabled,
            ...props
        } = this.props;
        const emptyTo = !props.to;
        const isHash = !emptyTo && props.to.startsWith('#');

        this.originalOnClick = onClick;
        props.onClick = this.handleClick;

        if (!emptyTo && !props.to.startsWith(`/${CONSTANTS.PATH}`) && !isHash) {
            external = true;
            // TODO: check if path matches current routes. This will help for
            // the main app, which has no path prefix.
        }

        if (disabled) {
            return <div { ...props
            }
            />;
        }

        if (this.props.animateScroll === false) {
            return <a { ...props
            }
            />;
        }

        if (!external && !emptyTo) {
            props.activeClassName = 'current';
            if (isHash && window.location && window.location.hash === props.to) {
                props.className = `${props.className ? `${props.className} ` : ''}${props.activeClassName}`;
            }
            return <InfernoLink { ...props
            }
            />;
        }

        props.href = props.to;
        if (blank !== false) {
            props.target = '_blank';
        }
        // For security: https://mathiasbynens.github.io/rel-noopener/
        props.rel = 'noopener';
        // We don't want this rendered on the <a> element.
        delete props.to;
        return <a { ...props
        }
        />;
    }
}


export class InputButton extends Component {
    @autobind
    handleClick(event) {
        if (this.originalOnClick) {
            this.originalOnClick(event);
        }
        if (this.props.clickLabel) {
            window.ga('send', 'event', 'button', 'click', this.props.clickLabel, {
                'transport': 'beacon',
            });
        }
    }
    render() {
        const {
            onClick,
            ...props
        } = this.props;
        delete props.clickLabel;

        this.originalOnClick = onClick;
        props.onClick = this.handleClick;

        return <input { ...props
        }
        />;
    }
}


export class Button extends Component {
    @autobind
    handleClick(event) {
        if (this.originalOnClick) {
            this.originalOnClick(event);
        }
        if (this.props.clickLabel) {
            window.ga('send', 'event', 'button', 'click', this.props.clickLabel, {
                'transport': 'beacon',
            });
        }
    }
    render() {
        const {
            onClick,
            ...props
        } = this.props;
        delete props.clickLabel;

        this.originalOnClick = onClick;
        props.onClick = this.handleClick;

        return <button { ...props
        }
        />;
    }
}


export class Tooltip extends Component {
    constructor(props, context) {
        super(props, context);
        this.state = {
            showToolTip: false,
        };
        if (props.addTooltipActivationCallback) {
            props.addTooltipActivationCallback(this.activate);
        }
    }
    @autobind
    activate() {
        this.setState({
            showToolTip: true
        });
        setTimeout(() => {
            this.setState({
                showToolTip: false
            });
        }, 1000);
    }

    render() {
        const {
            showToolTip
        } = this.state;
        const {
            children,
            msg,
            hoverMsg
        } = this.props;
        let content;

        if (children) {
            content = children;
        } else if (showToolTip && msg) {
            content = msg;
        } else if (hoverMsg) {
            content = hoverMsg;
        } else {
            return null;
        }

        return ( <
            div className = "Tooltip"
            style = {
                {
                    display: showToolTip ? 'block' : null
                }
            } >
            <
            span className = "content" > {
                content
            } <
            /span> <
            /div>
        );
    }
}

export class TooltipWrapper extends Component {
    constructor(props, context) {
        super(props, context);
        this.tooltipOffsetPct = .5;
        this.state = {
            showToolTip: false,
            left: `-${this.tooltipOffsetPct * 100}%`,
        };
        if (props.addTooltipActivationCallback) {
            props.addTooltipActivationCallback(this.activate);
        }
    }
    @autobind
    activate() {
        this.setState({
            showToolTip: true
        });

        setTimeout(() => {
            this.setState({
                showToolTip: false
            });
        }, 1000);
    }
    @autobind
    setElement(el) {
        this.tooltip = el;
    }

    @autobind
    onMouseOver() {
        const windowWidth = window.innerWidth;
        const padding = 20;
        const {
            left,
            right,
            width
        } = this.tooltip.getBoundingClientRect();
        const rightMarginOverlap = right - (width * this.tooltipOffsetPct) - windowWidth + padding;
        const leftMarginOverlap = (width * this.tooltipOffsetPct) - left + padding;

        // NOTE: ensures that tooltip does not overflow over edge of page
        if (rightMarginOverlap > 0) {
            const leftOffset = -(rightMarginOverlap + (width * this.tooltipOffsetPct));
            this.setState({
                left: leftOffset
            });
        } else if (leftMarginOverlap > 0) {
            const leftOffset = -((width * this.tooltipOffsetPct) - leftMarginOverlap);
            this.setState({
                left: leftOffset
            });
        }
    }

    @autobind
    onMouseLeave() {
        this.setState({
            left: `-${this.tooltipOffsetPct * 100}%`
        });
    }

    render() {
        const {
            showToolTip
        } = this.state;
        const {
            children,
            tooltipMsg,
            size
        } = this.props;

        return ( <
            span className = 'TooltipWrapper'
            onMouseOver = {
                this.onMouseOver
            }
            onMouseLeave = {
                this.onMouseLeave
            }
            onTouchStart = {
                () => {}
            } // HACK: iOS css "hover" trigger
            >
            <
            div className = {
                `TooltipV2 ${size}`
            }
            style = {
                {
                    display: showToolTip ? 'block' : null,
                }
            }
            ref = {
                this.setElement
            } >
            <
            span className = "content"
            style = {
                {
                    left: this.state.left,
                }
            } >
            {
                tooltipMsg
            } <
            /span> <
            /div> {
                children
            } <
            /span>
        );
    }
}

export class Copybox extends Component {
    constructor(props, context) {
        super(props, context);
        this.inputElement = null;
    }
    componentDidMount() {
        this.clipboard = new ClipboardJS(this.inputElement);
        this.clipboard.on('success', this.activateTooltip);

        if (this.props.autoActivate) {
            this.inputElement.click();
        }
    }
    componentWillUnmount() {
        this.clipboard && this.clipboard.destroy();
    }
    @autobind
    handleClick(event) {
        this.selectAll();
        window.ga('send', 'event', {
            eventCategory: 'Copybox',
            eventAction: 'click',
            eventLabel: this.props.value,
        });
    }
    selectAll() {
        this.inputElement.select();
    }
    @autobind
    setInputElement(element) {
        this.inputElement = element;
    }
    render() {
        const gettextSub = this.context.gtService.gettextSub;
        const {
            className,
            ...props
        } = this.props;

        return ( <
            div className = {
                `Copybox ${className}`.trim()
            } >
            <
            Tooltip msg = {
                gettextSub('Copied to clipboard')
            }
            addTooltipActivationCallback = {
                (callback) => {
                    this.activateTooltip = callback;
                }
            }
            /> <
            input type = "text"
            readonly = {
                true
            }
            onClick = {
                this.handleClick
            }
            ref = {
                this.setInputElement
            }
            data - clipboard - text = {
                props.value
            } { ...props
            }
            /> <
            /div>
        );
    }
}

export class ShareIcon extends Component {
    constructor(props, context) {
        super(props, context);
        this.imgElement = null;
    }

    @autobind
    handleClick(event) {
        if (this.props.onClick) {
            this.props.onClick(event, this);
        }
        window.ga('send', 'event', {
            eventCategory: 'ShareIcon',
            eventAction: 'click',
            eventLabel: this.props.service,
        });
    }

    @autobind
    setImgElement(element) {
        this.imgElement = element;
    }

    componentDidMount() {
        if (this.props.copyText) {
            this.clipboard = new ClipboardJS(this.imgElement);
            this.clipboard.on('success', this.activateTooltip);
        }
    }
    componentWillUnmount() {
        this.clipboard && this.clipboard.destroy();
    }
    render() {
        const gettextSub = this.context.gtService.gettextSub;

        const {
            title,
            service,
            url,
            mediaUrl,
            tags,
            copyText,
            ...props
        } = this.props;
        delete props.onClick;
        let name;
        const encodedTitle = encodeURIComponent(title || '');
        const encodedURL = encodeURIComponent(url);
        const encodedMediaUrl = encodeURIComponent(mediaUrl || '');
        let to;
        if (service === 'imessage') {
            name = 'iMessage';
            if (isMobile()) {
                to = 'https://apps.apple.com/app/apple-store/id917932200?pt=39040802&ct=iMessageItemView&mt=8';
            } else {
                to = '/mac';
            }
        } else if (service === 'facebook') {
            name = 'Facebook';
            to = `https://www.facebook.com/sharer/sharer.php?u=${encodedURL}`;
        } else if (service === 'twitter') {
            name = 'Twitter';
            to = `https://twitter.com/share?url=${encodedURL}&via=gifkeyboard`;
            if (tags && tags.length) {
                to += `&hashtags=${tags.join(',')}`;
            }
        } else if (service === 'reddit') {
            name = 'Reddit';
            to = `https://www.reddit.com/submit?url=${encodedURL}&title=${encodedTitle}`;
        } else if (service === 'pinterest') {
            name = 'Pinterest';
            to = `https://pinterest.com/pin/create/bookmarklet/?media=${encodedMediaUrl}&url=${encodedURL}&is_video=false&description=${encodedTitle}`;
        } else if (service === 'tumblr') {
            name = 'Tumblr';
            to = `https://www.tumblr.com/share?v=3&u=${encodedURL}&t=${encodedTitle}`;
            if (tags && tags.length) {
                to += `&tags=${tags.join(',')}`;
            }
        } else if (service == 'link') {
            name = 'link';
        } else if (service == 'embed') {
            name = 'embed';
        }
        if (copyText) {
            return ( <
                span className = "ShareIcon"
                onClick = {
                    this.handleClick
                } { ...props
                } >
                <
                Tooltip msg = {
                    gettextSub('Copied to clipboard.')
                }
                hoverMsg = {
                    gettextSub('Copy {name} to clipboard.', {
                        name
                    })
                }
                addTooltipActivationCallback = {
                    (callback) => {
                        this.activateTooltip = callback;
                    }
                }
                /> <
                img src = {
                    `/assets/img/icons/${service}.svg`
                }
                alt = {
                    `${name} icon`
                }
                ref = {
                    this.setImgElement
                }
                data - clipboard - text = {
                    copyText
                }
                /> <
                /span>
            );
        }
        return ( <
            Link className = "ShareIcon"
            to = {
                to
            }
            onClick = {
                this.handleClick
            } { ...props
            } >
            <
            Tooltip hoverMsg = {
                gettextSub('Share to {name}.', {
                    name
                })
            }
            /> <
            img src = {
                `/assets/img/icons/${service}.svg`
            }
            alt = {
                gettextSub('{name} icon', {
                    name
                })
            }
            /> <
            /Link>
        );
    }
}

export class FlagIcon extends Component {
    @autobind
    handleClick(event) {
        const gettextSub = this.context.gtService.gettextSub;

        const pid = getV1PostId(this.props.gif) || this.props.gif.id;

        dialog.open('confirmation-dialog', {
            header: gettextSub(`Report Gif`),
            message: gettextSub(`Are you sure you want to report this item for violating Tenor content policies?`),
            confirmButtonText: gettextSub(`Yes`),
            confirmCallback: () => this.report(pid),
            denyButtonText: gettextSub(`No`),
        });
    }

    @autobind
    report(pid) {
        this.context.apiService.oldAPI('GET', '/keyboard.report', {
                pid: pid
            })
            .then(function() {
                window.ga('send', 'event', {
                    eventCategory: 'FlagIcon',
                    eventAction: 'click',
                    eventLabel: pid,
                });
                dialog.open('flag-dialog');
            }, console.error);
    }

    render() {
        const gettextSub = this.context.gtService.gettextSub;

        return ( <
            span className = "FlagIcon"
            onClick = {
                this.handleClick
            } >
            <
            Tooltip hoverMsg = {
                gettextSub('Report')
            }
            /> <
            img src = {
                `/assets/img/icons/flag.svg`
            }
            alt = {
                gettextSub('flag icon')
            }
            /> <
            /span>
        );
    }
}

export class CustomComponent extends Component {
    constructor(props, context) {
        super(props, context);
        this.state = {
            updateCounter: 0
        };
    }
    log(...args) {
        args.unshift(this.constructor.name);
        console.log(...args);
    }
    setState(newState, callback) {
        if (!this.$BS) {
            super.setState(newState, callback);
        } else {
            Object.assign(this.state, newState);
            callback && callback();
        }
    }
    @autobind
    triggerUpdate() {
        // Only needed if already in middle of update and DOM exists.
        if (!this.$BS && this.$V && this.$V.dom) {
            // If a child component overwrite this.state, this param can get lost.
            if (typeof this.state.updateCounter === 'undefined') {
                console.warn('this.state.updateCounter is undefined');
                this.state.updateCounter = 0;
            }
            this.setState({
                updateCounter: this.state.updateCounter + 1
            });
        }
    }
    parseURLSearchTags(s, checkPath) {
        return this.context.gtService.parseURLSearchTags(s, checkPath);
    }
    linkToPack(id) {
        return this.context.gtService.localizeUrlPath(`/packs/${id}`);
    }
    linkToCollection(id) {
        return this.context.gtService.localizeUrlPath(`/collections/${id}`);
    }
    linkToView(gif) {
        // API will utf8 percent encoded urls, so we need to decode.
        const parsedURL = new LiteURL(gif.itemurl);
        return this.context.gtService.localizeUrlPath(parsedURL.pathname) + parsedURL.search;
    }
    linkToProfile(user, mediatype) {
        if (!user || (!user.url && !user.username)) {
            user = authService.getUser();
        }
        const userPath = authService.userHasFlag('partner') ? '/official/' : '/users/';
        const mediaPath = (mediatype ? `/${mediatype}` : '');

        if (user && user.url) {
            return this.context.gtService.localizeUrlPath(localURL(user.url.toLowerCase().replace('/user/', userPath) + mediaPath));
        }
        let username = '';
        if (user && user.username) {
            username = user.username;
        }
        const path = `${userPath}${username.toLowerCase()}${mediaPath}`;
        return this.context.gtService.localizeUrlPath(path);
    }
    linkToSearch(terms, mediatype) {
        if (!Array.isArray(terms)) {
            terms = terms.split(rootScope.searchInputSepRegEx);
        } else {
            terms = terms.concat();
        }
        terms = removeEmptyStrings(cleanTermsForURL(terms)).join(rootScope.searchURLSep);

        const url = `/search/${terms}${mediatype === 'stickers' ? rootScope.searchEndStickers : rootScope.searchEndGifs}`;
        return this.context.gtService.localizeUrlPath(url);
    }
}


export class Page extends CustomComponent {
    constructor(props, context) {
        super(props, context);
        emitter.emit('start-progress-bar');
        this.handleNewPage(props, this.state);
        this.requiredScopes = [];
    }
    componentDidMount() {
        emitter.on('authDataSet', this.triggerUpdate);
    }
    componentWillUnmount() {
        emitter.off('authDataSet', this.triggerUpdate);
    }
    componentWillUpdate(nextProps, state) {
        // React/Inferno will reuse components when switching between pages of
        // the same type.
        // NOTE: componentWillUpdate gets called on state changes as well.
        if (this.pageChanged(nextProps, state)) {
            this.handleNewPage(nextProps, state);
        } else if (this.propsNeedProcessing(nextProps, state)) {
            this.processNewProps(nextProps, state);
        }
    }
    handleNewPage(props, state) {
        this.startDate = Date.now();
        if (process.env.BROWSER) {
            // Only need to worry about this client side. On the server side,
            // we need to keep any data set before now.
            this.context.response.reset();
        }
        this.canonicalRedirectEnabled = true;
        this.canonicalCaseSensitive = true;
        this.pageInit(props, state);
        this.processNewProps(props, state);
        Promise.all(this.context.store.pendingPromises).then(this.handlePageDone);
    }
    processNewProps(props, state) {

    }
    pageChanged(props, state) {
        // According to the docs, shouldComponentUpdate may be treated as a
        // hint in the future, which is why we take manual control over the
        // process here. This determines whether `this.pageInit()` gets called,
        // which is where page setup code should go, instead of in `render()`,
        // which could result in state being overwritten.
        return false;
    }
    propsNeedProcessing(props, state) {
        // According to the docs, shouldComponentUpdate may be treated as a
        // hint in the future, which is why we take manual control over the
        // process here. This determines whether `this.processNewProps()` gets called,
        // which is where changes in props and state within a page load should
        // be handled, instead of in `render()`, which could result in state
        // being overwritten.
        return false;
    }
    get currentLocation() {
        return this.context.router.history.location;
    }
    get currentPath() {
        return this.context.router.history.location.pathname;
    }
    get canonicalURL() {
        if (this._canonicalURL) {
            return this._canonicalURL;
        }
        let currentPath = this.currentPath;
        // FIXME: if we want to support locales with country codes, we'll need
        // to change the way we normalize urls.
        if (this.canonicalCaseSensitive) {
            currentPath = currentPath.toLowerCase();
        }
        return fullURL(currentPath);
    }
    get encodedCanonicalURL() {
        return encodeURIComponent(this.canonicalURL);
    }
    setCanonicalURL(url) {
        if (url.charAt(0) === '/') {
            url = fullURL(url);
        }
        this._canonicalURL = url;
        console.log('setCanonicalURL', this._canonicalURL);
    }
    @autobind
    handlePageDone() {
        // This logging statement is needed for our e2e tests. :(
        console.info('handlePageDone');
        emitter.emit('finish-progress-bar');
        // Facebook and Google Analytics tracking
        if (process.env.BROWSER && window.ga) {
            let pageUrl = this.context.router.history.location.pathname;
            if (this.context.router.history.location.search) {
                pageUrl += this.context.router.history.location.search;
            }

            window.ga('set', {
                page: pageUrl,
                title: this.title,
                // dimension1 is a custom dimension. If not set, we need to clear
                // it (null) to prevent previous values from being kept.
                dimension1: this.searchPageMultivariateGroup !== undefined ? this.searchPageMultivariateGroup : null,
            });

            window.ga('send', 'pageview');

            window.fbq('track', 'PageView');

            window.ga('send', {
                hitType: 'timing',
                timingCategory: 'Custom App',
                timingVar: 'pageDone',
                timingValue: Date.now() - this.startDate,
            });
        }
    }
    redirect(url, permanent) {
        console.log('redirect', url, permanent);
        this.context.response.status = permanent ? 301 : 302;
        this.context.response.headers.location = url;
        if (process.env.BROWSER) {
            const parsedURL = new LiteURL(url);
            if (parsedURL.hostname && parsedURL.hostname != this.context.request.hostname) {
                window.location = url;
            } else {
                console.log('parsedURL', parsedURL);
                this.context.router.history.push(parsedURL.pathname + parsedURL.search);
            }
        }
    }
    renderPage() {
        /**
         * The page to render.
         * @returns {Component} JSX to render
         */
        return <div / > ;
    }
    renderErrorPage() {
        /**
         * The page to render when an error is encountered.
         * @returns {Component} JSX to render
         */
        const gettextSub = this.context.gtService.gettextSub;

        let msg;
        if (this.context.response.status === 404) {
            msg = gettextSub('We could not find the page you were looking for.');
            this.ttl = CONSTANTS.HTTP404_PAGE_TTL;
        } else if (this.context.response.status === 403) {
            msg = gettextSub('You do not have access to this page.');
            this.ttl = CONSTANTS.PAGE_TTL;
        } else {
            msg = gettextSub('An error occurred, please try again later.');
            this.ttl = CONSTANTS.PAGE_TTL;
        }

        return ( <
            div className = "error-page container page" >
            <
            Metadata page = {
                this
            }
            /> <
            div className = "center-container heading-wrapper" >
            <
            h1 > {
                this.title
            } < /h1> <
            /div> <
            div className = "single-view-container" >
            <
            p > {
                msg
            } < /p> <
            /div> <
            /div>
        );
    }
    render() {
        const gettextSub = this.context.gtService.gettextSub;

        if (!process.env.BROWSER && this.context.request.preRendering) {
            return null;
        }
        let showErrorPage = false;
        let html;

        if (this.context.response.status >= 400 && !this.context.response.keepPage) {
            this.title = gettextSub('{statusCode} Error', {
                statusCode: this.context.response.status
            });
            showErrorPage = true;
        }

        // If new controller has a canonicalURL, redirect to it if necessary.
        // We have to compare the decoded versions since sometimes we need to
        // match upper case hex with lowercase hex, but otherwise still do a
        // case sensitive comparison.

        const canonicalPath = localURL(this.canonicalURL);
        const currentPath = this.currentPath;
        const request = this.context.request;
        console.log('comparing urls (canonical:actual): ', {
            path: canonicalPath,
            scheme: CONSTANTS.NGINX_SCHEME,
            host: CONSTANTS.NGINX_HOST,
        }, {
            path: currentPath,
            scheme: request.protocol,
            host: request.hostname,
        });

        if (!process.env.BROWSER && this.canonicalRedirectEnabled && !this.context.response.headers.location && (canonicalPath !== currentPath ||
                CONSTANTS.NGINX_SCHEME !== request.protocol ||
                CONSTANTS.NGINX_HOST !== request.hostname)) {
            this.context.response.headers['x-debug-canonicalPath'] = canonicalPath;
            this.context.response.headers['x-debug-currentPath'] = currentPath;
            this.context.response.headers['x-debug-canonicalProtocol'] = CONSTANTS.NGINX_SCHEME;
            this.context.response.headers['x-debug-currentProtocol'] = request.protocol;
            this.context.response.headers['x-debug-canonicalHostname'] = CONSTANTS.NGINX_HOST;
            this.context.response.headers['x-debug-currentHostname'] = request.hostname;
            this.redirect(this.canonicalURL + this.context.router.history.location.search, true);
            html = < div / > ;
        } else if (showErrorPage) {
            html = this.renderErrorPage();
        } else {
            html = this.renderPage();
        }
        console.log('checking scopes');
        for (const scope of this.requiredScopes) {
            if (!authService.hasOAuthScope(scope)) {
                console.log('scope missing', scope);
                authService.showScopeRefreshDialog({
                    permissionText: this.permissionText
                });
                break;
            }
        }
        // TODO: move metadata generation here/getMetadata method.

        let ttl = this.ttl || CONSTANTS.PAGE_TTL;
        const DAY = 86400;
        let swr = DAY * 3;
        let sie = DAY * 3;
        if (this.noindex) {
            // If not indexed, it's less important to always have a cached version ready.
            ttl = CONSTANTS.PAGE_TTL;
            swr = DAY * 2;
            sie = DAY * 2;
        }
        this.context.response.headers['cache-control'] = `max-age=${ttl}, stale-while-revalidate=${swr}, stale-if-error=${sie}`;
        return html;
    }
}