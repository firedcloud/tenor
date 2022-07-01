import {
    autobind
} from 'core-decorators';

import Modernizr from 'modernizr';

import {
    Component
} from 'inferno'; // eslint-disable-line no-unused-vars

import {
    Copybox,
    Link,
    Page,
    ShareIcon,
    FlagIcon
} from '../../common/components';
import {
    DetectContextMenuWrapper
} from '../../common/components/DetectContextMenuWrapper';
import {
    CONSTANTS
} from '../../common/config';
import {
    Metadata
} from '../../common/metadata';
import authService from '../../common/services/authService';
import {
    capitalize,
    cleanMultiwordTag,
    fullURL,
    getArticleLDJSON,
    getV1PostId,
    gifCountryAllowed,
    isMobile,
    safelySerializeJSON,
    window,
    isSticker,
    isStaticImage
} from '../../common/util';

import {
    FloatingTwgButton,
    TwgCounter,
    TwgThankWall
} from '../components/amplio';
import {
    Gif,
    MEDIA_QUALITY_MAPPING,
    MEDIA_QUALITY
} from '../components/Gif';
import {
    MEDIA_TYPE
} from '../components/GifConstants';
import {
    GifFavButton
} from '../components/GifFavButton';
import {
    GifRestrictedMessage
} from '../components/GifRestrictedMessage';
import {
    StaticImageInfoIcon
} from '../components/StaticImageInfoIcon';
import {
    GifList
} from '../components/GifList';
import {
    gifOGMeta
} from '../components/gifOGMeta';
import {
    ProfileImage
} from '../components/ProfileImage';
import {
    RelatedTag
} from '../components/Tag';
import {
    UpsellPill
} from '../components/UpsellPill';
import {
    OfficialBadge
} from '../components/OfficialBadge';

import rootScope from '../services/rootScope';
import LiteURL from 'lite-url';
import {
    subscribe,
    transformProps
} from '../../../replete';
import bigInt from 'big-integer';
import './gif.scss';


function parseViewId(s) {
    // Find the last number in the URL.
    const m = s.match(/.*?(\d+)[^\d]*$/);
    if (m && m[1]) {
        return m[1];
    }

    return null;
}

const _alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');
const _alphabetMap = {};
for (let i = 0; i < _alphabet.length; i++) {
    _alphabetMap[_alphabet[i]] = i.toString();
}

function parseViewShortId(s) {
    s = s.split('');
    // NOTE using big-integer npm package since BigInt not supported on iOS
    let n = bigInt.zero;
    for (let i = 0; i < s.length; i++) {
        n = n.times(_alphabet.length).plus(_alphabetMap[s[i]]);
    }
    return n.toString();
}

function addShareButtonUtm(baseUrl, type) {
    const trackingSearchParams = new URLSearchParams();
    trackingSearchParams.set('utm_source', 'share-button');
    trackingSearchParams.set('utm_medium', 'Social');
    trackingSearchParams.set('utm_content', type);
    return `${baseUrl}?${trackingSearchParams.toString()}`;
}

function QualityToggle(props, context) {
    const gettextSub = context.gtService.gettextSub;

    const {
        gifQuality,
        gifPage,
        gif
    } = props;
    const selected = props.gifLoaded && gifQuality;
    const mediaType = gifPage.isSticker ? MEDIA_TYPE.STICKER : MEDIA_TYPE.GIF;

    const formatMissing = (quality) => {
        let formats = MEDIA_QUALITY_MAPPING[quality][mediaType];
        if (!Array.isArray(formats)) {
            formats = [formats];
        }
        return !formats.some((format) => Gif.hasFormat(gif, format));
    };

    const clickHandler = (gifQuality) => {
        window.ga('send', 'event', {
            eventCategory: 'QualityToggle',
            eventAction: 'click',
            eventLabel: MEDIA_QUALITY_MAPPING[gifQuality][mediaType],
        });
        gifPage.setSize(gifQuality);
        gifPage.fixHeight();
    };

    return <div className = "QualityToggle" >

        <
        button
    className = {
        selected === MEDIA_QUALITY.SD ? 'selected' : ''
    }
    disabled = {!props.gifLoaded || formatMissing(MEDIA_QUALITY.SD)
    }
    onClick = {
            () => clickHandler(MEDIA_QUALITY.SD)
        } >
        ●{
            gettextSub('SD GIF')
        } < /button>

        <
        button
    className = {
        selected === MEDIA_QUALITY.HD ? 'selected' : ''
    }
    disabled = {!props.gifLoaded || formatMissing(MEDIA_QUALITY.HD)
    }
    onClick = {
            () => clickHandler(MEDIA_QUALITY.HD)
        } >
        ●{
            gettextSub('HD GIF')
        } < /button>

    {
        mediaType !== MEDIA_TYPE.STICKER && < button
        className = {
            selected === MEDIA_QUALITY.VIDEO ? 'selected' : ''
        }
        disabled = {!props.gifLoaded || formatMissing(MEDIA_QUALITY.VIDEO)
        }
        onClick = {
                () => clickHandler(MEDIA_QUALITY.VIDEO)
            } >
            ●{
                gettextSub('MP4')
            } < /button> } <
            /div>;
    }


    @transformProps((props) => {
        const routeId = decodeURI(props.match.params.id || '');
        const routeShortId = decodeURI(props.match.params.shortId || '');

        if (routeId) {
            props.gifId = parseViewId(routeId);
        } else {
            props.gifId = parseViewShortId(routeShortId);
        }
        props.routeId = routeId;

        return props;
    })
    @subscribe({
        gif: ['api.gifs.byId.*', 'gifId'],
        relatedGifs: ['api.gifs.related.*', 'gifId'],
    })
    export class GifPage extends Page {
        constructor(props, context) {
            super(props, context);
            this.gifContainer = null;
            this.minStickerDim = 256;
        }
        pageChanged(nextProps) {
            return nextProps.gifId !== this.props.gifId;
        }
        propsNeedProcessing(nextProps) {
            for (const key of ['gifs', 'relatedGifs']) {
                if (nextProps[key] !== this.props[key]) {
                    return true;
                }
            }
            return false;
        }
        pageInit(props) {
            this.log(props.id, props.shortId);

            this.ttl = CONSTANTS.VIEW_PAGE_TTL;
            this.setState({
                gifLoaded: false,
                hasAutoplay: null,
                showCopyBox: false,
                gifQuality: MEDIA_QUALITY.SD,
                muted: true,
            });

            this.context.response.vary('X-Preferred-Type');
            this.context.response.surrogateKey('GifPage', '/view/', `gif-${this.props.gifId}`);

            this.previousTags = [];
            this.parseURLSearchTags(rootScope.previousPath || '', true).forEach((item) => {
                this.previousTags.push(decodeURIComponent(item).toLowerCase());
            });

            if (process.env.BROWSER) {
                Modernizr.on('videoautoplay', (hasAutoplay) => {
                    // this test passes on mobile Chrome even though autoplay isn't supported.
                    this.setState({
                        hasAutoplay: hasAutoplay && !(isMobile() && rootScope.isWebKit)
                    });
                });
            } else {
                this.state.hasAutoplay = false;
            }
            this.fixHeight(props);
        }
        processNewProps(props) {
            this.handleGifBody(props);
        }
        @autobind
        handlePageDone() {
            super.handlePageDone();
            if (process.env.BROWSER && this.props.match.params.action === 'add-favorite') {
                if (authService.isLoggedIn()) {
                    this.context.apiService.setFavorite({
                        pid: this.props.gifId,
                        remove: false,
                    });
                } else {
                    authService.showLoginDialog();
                }
            }
        }
        @autobind
        toggleMute(event) {
            this.setState({
                muted: !this.state.muted
            });

            // Prevent context diallog from opening.
            event.stopPropagation();
        }
        @autobind
        onShareIconClick(event, socialIcon) {
            this.registerShare();
            if (['link', 'embed'].includes(socialIcon.props.service)) {
                this.state.showCopyBox = true;
                this.triggerUpdate();
            }
            window.ga('send', 'event', {
                eventCategory: 'Share Button',
                eventAction: 'click',
                eventLabel: socialIcon.props.service,
            });
        }

        @autobind
        registerShare() {
            const gif = this.props.gif.results[0];
            this.context.apiService.registerShare(gif);

            if (gif.feature_info) {
                this.context.apiService.registerAdShare(gif);
            }
            this.showOptInFlow();
        }

        @autobind
        fixHeight(props = this.props) {
            // width: 100% and height: auto causes the element to be collapsed
            // during load, so no bg_color shows up. So we have to manually set
            // this in JS.
            // Element width not available on backend.

            // NOTE page resize handler passes event object and we must use this.props instead.
            const gif = props.gif ? props.gif.results[0] : this.props.gif.results[0];
            const newState = {};
            const containerWidth = (this.gifContainer && this.gifContainer.offsetWidth) || 400;
            let aspectRatio;

            if (gif) {
                const {
                    gifQuality
                } = this.state;
                const mediaType = isSticker(gif) ? MEDIA_TYPE.STICKER : MEDIA_TYPE.GIF;
                const format = MEDIA_QUALITY_MAPPING[gifQuality][mediaType];
                const dims = Gif.getFormatDims(gif, format) || [100, 100];
                aspectRatio = dims[0] / dims[1];
                newState.minHeight = '';

                if (mediaType === MEDIA_TYPE.STICKER) {
                    const maxDimension = (dims[0] > dims[1] ? dims[0] : dims[1]);
                    const minWidth = this.minStickerDim + Gif.getStickerPadding() * 2;
                    let width = maxDimension + Gif.getStickerPadding() * 2;
                    width = width < minWidth ? minWidth : width; // ensure minimum width
                    width = width > containerWidth ? containerWidth : width; // ensure width remains bounded by container
                    newState.width = width;
                    newState.height = width;
                } else {
                    newState.height = containerWidth / aspectRatio;
                    newState.width = newState.height * aspectRatio;
                }
            } else {
                aspectRatio = 1.33;
                newState.height = containerWidth / aspectRatio;
                newState.width = newState.height * aspectRatio;
                newState.minHeight = `${newState.height}px`;
            }
            Object.assign(this.state, newState);
            this.triggerUpdate();
        }
        componentDidMount() {
            // needed so that Gif size gets updated in render().
            window.addEventListener('resize', this.fixHeight);
        }
        componentWillUnmount() {
            window.removeEventListener('resize', this.fixHeight);
        }
        @autobind
        setGifContainer(element) {
            this.gifContainer = element;
            this.fixHeight();
        }
        @autobind
        setAmplioWallContainer(element) {
            this.amplioWallContainer = element;
        }
        @autobind
        setAmplioCounterContainer(element) {
            this.amplioCounterContainer = element;
        }
        handleGifBody(props) {
            const gettextSub = this.context.gtService.gettextSub;

            const body = props.gif;
            if (body.results.length === 0) {
                if (!body.pending) {
                    this.context.response.status = 404;
                }
                return;
            }
            const newState = {};

            const gif = body.results[0];

            this.isSticker = isSticker(gif);
            this.isStaticImage = isStaticImage(gif);

            const mediaType = this.isSticker ? MEDIA_TYPE.STICKER : MEDIA_TYPE.GIF;

            const hdMediaFormat = MEDIA_QUALITY_MAPPING[MEDIA_QUALITY.HD][mediaType];
            const sdMediaFormat = MEDIA_QUALITY_MAPPING[MEDIA_QUALITY.SD][mediaType];
            const fallbackFormat = MEDIA_QUALITY_MAPPING[MEDIA_QUALITY.FALLBACK][mediaType];

            if (Gif.hasFormat(gif, hdMediaFormat) && Gif.getFormatParam(gif, hdMediaFormat, 'size') < 4000000) {
                this.state.gifQuality = MEDIA_QUALITY.HD;
            } else if (Gif.hasFormat(gif, sdMediaFormat)) {
                this.state.gifQuality = MEDIA_QUALITY.SD;
            } else if (Gif.hasFormat(gif, fallbackFormat)) {
                this.state.gifQuality = MEDIA_QUALITY.FALLBACK;
            } else if (!body.pending && !props.relatedGifs.pending) {
                this.context.response.status = 404;
                return;
            }

            const gifExt = props.routeId.substr(-4) === '.gif';
            // Forward to GIF URL if .gif was requested or a bot asks for
            // something besides html.
            if (gifExt || this.context.request.preferredType === 'img-redirect') {
                this.redirect(Gif.getFormatUrl(gif, 'gif'));
                return;
            } else {
                this.setCanonicalURL(this.linkToView(gif));
                this.log('canonicalURL', this.canonicalURL);
            }

            this.fixHeight(props);

            if (process.env.BROWSER) {
                newState.hasPlayableVideo = Boolean(Modernizr.video.webm && Gif.hasFormat(gif, 'webm')) || Boolean(Modernizr.video.h264 && Gif.hasFormat(gif, 'mp4'));
            } else {
                newState.hasPlayableVideo = false;
            }

            let first3Terms = gif.tags.slice(0, 3);
            for (let i = 0; i < first3Terms.length; i++) {
                first3Terms[i] = capitalize(first3Terms[i]);
            }
            first3Terms = first3Terms.join(' ');

            this.h1_title = gif.h1_title;
            this.title = gettextSub('{h1_title} - {first3Terms} - Discover & Share GIFs', {
                h1_title: this.h1_title,
                first3Terms: first3Terms
            });

            this.description = gettextSub('The perfect {first3Terms} Animated GIF for your conversation. Discover and Share the best GIFs on Tenor.', {
                first3Terms
            });
            this.keywords = `${gif.tags.join(',')},gif,animated gif,gifs,meme`;

            this.embedUrl = fullURL(`/embed/${gif.id}`);

            const shareTags = gif.tags.slice(0, 3);
            this.shareButtons = {
                'imessage': {},
                'facebook': {
                    'url': addShareButtonUtm(this.canonicalURL, 'facebook'),
                },
                'twitter': {
                    'url': addShareButtonUtm(this.canonicalURL, 'twitter'),
                    'tags': shareTags,
                },
                'reddit': {
                    'url': addShareButtonUtm(this.canonicalURL, 'reddit'),
                },
                'pinterest': {
                    'url': addShareButtonUtm(this.canonicalURL, 'pinterest'),
                    'mediaUrl': Gif.getFormatUrl(gif, 'gif'),
                },
                'tumblr': {
                    'url': addShareButtonUtm(this.canonicalURL, 'tumblr'),
                    'tags': shareTags,
                },
                'link': {
                    copyText: CONSTANTS.BASE_URL + (new LiteURL(gif.url).pathname),
                },
                'embed': {
                    copyText: gif.embed,
                },
            };

            Object.assign(this.state, newState);
            window.fbq('track', 'ViewContent', {
                content_name: this.title
            });
        }

        @autobind
        onCompletedGif() {
            if (!this.state.gifLoaded) {
                this.setState({
                    gifLoaded: true
                });
            }
        }
        @autobind
        setSize(size) {
            this.setState({
                gifQuality: size
            });
        }
        @autobind
        onGifContainerContextMenu(event) {
            const gif = this.props.gif.results[0];
            if (gif && gif.media && gif.media.length) {
                window.ga('send', 'event', {
                    eventCategory: 'single-gif-container',
                    eventAction: 'contextmenu',
                });
            }
        }

        @autobind
        setGifMakerInitialState(event) {
            const url = this.context.router.route.location.pathname;
            const gif = this.props.gif.results[0];
            if (gif && gif.media && gif.media.length) {
                this.context.store.set('ui.GifMakerPage.itemPageCaptioning', {
                    status: true,
                    gif,
                    url,
                });
            }
        }

        @autobind
        profileLinkingDisabled(gif) {
            const denylist = CONSTANTS.PROFILE_LINK_DENYLIST;
            return gif.user && denylist.includes(gif.user.username);
        }

        @autobind
        showOptInFlow() {
            if (authService.isLoggedIn() && authService.hasNotAcceptedTOS()) {
                // TODO add a delay to the opt-in dialog box?
                setTimeout(() => {
                    return authService.showOptInDialog();
                }, 1000);
            }
        }
        renderPage() { // eslint-disable-line complexity
                const gettextSub = this.context.gtService.gettextSub;

                const gif = this.props.gif.results[0];
                const detailsEls = [];
                let mp4Format;
                let gifFormat;
                let gifAspectRatio;
                let iosURL;
                let androidURL;

                let articleLDJSON = {};
                let publisherLDJSON = {};
                let gifLDJSON = {};
                let videoLDJSON = {};

                if (gif) {
                    iosURL = `riffsykeyboard://riff/${gif.id}`;
                    androidURL = `riffsy://gifs/${gif.id}`;
                    mp4Format = Gif.getFormat(gif, 'mp4');
                    gifFormat = Gif.getFormat(gif, 'gif');
                    gifAspectRatio = gifFormat.dims[0] / gifFormat.dims[1];

                    if (gif.generatedcaption) {
                        detailsEls.push( < dd > {
                                gettextSub('Caption')
                            }: & nbsp; & ldquo; {
                                gif.generatedcaption
                            } & rdquo; < /dd>);
                        }
                        if (gifFormat.size) {
                            detailsEls.push( < dd > {
                                    gettextSub('File Size')
                                }: & nbsp; {
                                    Math.ceil(gifFormat.size / 1024)
                                }
                                KB < /dd>);
                            }
                            if (mp4Format.duration) {
                                detailsEls.push( < dd > {
                                        gettextSub('Duration')
                                    }: & nbsp; {
                                        mp4Format.duration.toFixed(3)
                                    }
                                    sec < /dd>);
                                }
                                detailsEls.push( < dd > {
                                            gettextSub('Dimensions')
                                        }: & nbsp; {
                                            gifFormat.dims[0]
                                        }
                                        x {
                                            gifFormat.dims[1]
                                        } < /dd>);
                                        if (gif.created) {
                                            const createdDT = new Date(gif.created * 1000);
                                            detailsEls.push( < dd > {
                                                    gettextSub('Created')
                                                }: & nbsp; {
                                                    createdDT.toLocaleString()
                                                } < /dd>);
                                            }

                                            articleLDJSON = getArticleLDJSON(this, gif);
                                            publisherLDJSON = articleLDJSON.publisher;
                                            gifLDJSON = articleLDJSON.image;
                                            videoLDJSON = articleLDJSON.video;
                                        }

                                        const style = {
                                            width: `${this.state.width}px`,
                                            height: `${this.state.height}px`,
                                        };
                                        const mediaStyle = {
                                            maxWidth: `${this.state.width}px`,
                                            minHeight: this.state.minHeight,
                                        };
                                        const relatedGifs = this.props.relatedGifs.results.filter((g) => {
                                            return !gif || g.id !== gif.id;
                                        }).slice(0, 7);

                                        const gifQuality = this.state.gifQuality;
                                        const showVideo = gifQuality === MEDIA_QUALITY.VIDEO;
                                        // This controls what we expose in our markup to Google.

                                        const countryAllowed = gifCountryAllowed(gif, this.context);

                                        const allowCaptioning = countryAllowed && !this.isStaticImage && !this.isSticker;
                                        const allowFavoriting = countryAllowed && !this.isStaticImage && !this.isSticker;
                                        const showQualityToggle = countryAllowed && !this.isStaticImage;
                                        const showAuthor = countryAllowed;
                                        const showTags = !this.isStaticImage && gif && gif.tags.length > 0;
                                        const showSharingOptions = countryAllowed && !this.isStaticImage;
                                        const showGifDetails = !this.isStaticImage;
                                        const showStaticImageInfoIcon = this.context.featureFlags.staticImageBetaEnabled && this.isStaticImage;
                                        const showRelatedGifs = !this.isStaticImage && relatedGifs.length > 0;

                                        const username = gif && gif.user && gif.user.username;

                                        return ( <
                                                div className = "GifPage container page" > {
                                                    gif && < Metadata page = {
                                                        this
                                                    } > {
                                                        gif.geographic_restriction && < meta name = "robots"
                                                        content = "noindex" / >
                                                    }

                                                    <
                                                    meta name = "twitter:app:url:iphone"
                                                    content = {
                                                        iosURL
                                                    }
                                                    /> <
                                                    meta name = "twitter:app:url:ipad"
                                                    content = {
                                                        iosURL
                                                    }
                                                    /> <
                                                    meta name = "twitter:app:url:googleplay"
                                                    content = {
                                                        androidURL
                                                    }
                                                    />

                                                    <
                                                    meta property = "al:ios:url"
                                                    content = {
                                                        iosURL
                                                    }
                                                    /> <
                                                    meta property = "al:android:url"
                                                    content = {
                                                        androidURL
                                                    }
                                                    />

                                                    <
                                                    link rel = "alternate"
                                                    href = {
                                                        `ios-app://917932200/riffsykeyboard/riff/${gif.id}`
                                                    }
                                                    /> <
                                                    link rel = "alternate"
                                                    href = {
                                                        `android-app://com.riffsy.FBMGIFApp/riffsy/gifs/${gif.id}`
                                                    }
                                                    />

                                                    <
                                                    meta name = "twitter:image"
                                                    content = {
                                                        gifFormat.url
                                                    }
                                                    /> <
                                                    meta name = "twitter:card"
                                                    content = "player" / >
                                                    <
                                                    meta name = "twitter:player"
                                                    content = {
                                                        `${this.embedUrl}?playertype=card`
                                                    }
                                                    /> <
                                                    meta name = "twitter:player:width"
                                                    content = "498" / >
                                                    <
                                                    meta name = "twitter:player:height"
                                                    content = {
                                                        parseInt(498 / gifAspectRatio)
                                                    }
                                                    /> <
                                                    meta name = "twitter:player:stream"
                                                    content = {
                                                        mp4Format.url
                                                    }
                                                    /> <
                                                    meta name = "twitter:player:stream:content_type"
                                                    content = "video/mp4" / >

                                                    <
                                                    link rel = "alternate"
                                                    type = "application/json+oembed"
                                                    title = "GIF oEmbed Profile"
                                                    href = {
                                                        fullURL(`/oembed?url=${this.encodedCanonicalURL}`)
                                                    }
                                                    /> <
                                                    link rel = "alternate"
                                                    type = "text/xml+oembed"
                                                    title = "GIF oEmbed Profile"
                                                    href = {
                                                        fullURL(`/oembed?url=${this.encodedCanonicalURL}&format=xml`)
                                                    }
                                                    />

                                                    {
                                                        gifOGMeta(gif)
                                                    }

                                                    <
                                                    script type = "application/ld+json"
                                                    dangerouslySetInnerHTML = {
                                                        {
                                                            __html: safelySerializeJSON(articleLDJSON)
                                                        }
                                                    }
                                                    /> <
                                                    /Metadata> } <
                                                    div className = "main-container" >
                                                    <
                                                    FloatingTwgButton username = {
                                                        username
                                                    }
                                                    title = {
                                                        this.h1_title
                                                    }
                                                    /> <
                                                    h1 style = {
                                                        {
                                                            marginBottom: '30px'
                                                        }
                                                    } > {
                                                        this.h1_title
                                                    } < /h1> <
                                                    div className = "single-view-container"
                                                    itemscope = {
                                                        true
                                                    }
                                                    itemtype = "http://schema.org/Article" >
                                                    <
                                                    meta itemprop = "url"
                                                    content = {
                                                        articleLDJSON.url
                                                    }
                                                    /> <
                                                    meta itemprop = "mainEntityOfPage"
                                                    content = {
                                                        articleLDJSON.mainEntityOfPage
                                                    }
                                                    /> <
                                                    meta itemprop = "keywords"
                                                    content = {
                                                        articleLDJSON.keywords
                                                    }
                                                    /> <
                                                    meta itemprop = "dateModified"
                                                    content = {
                                                        articleLDJSON.dateModified
                                                    }
                                                    /> <
                                                    meta itemprop = "datePublished"
                                                    content = {
                                                        articleLDJSON.datePublished
                                                    }
                                                    /> <
                                                    meta itemprop = "author"
                                                    content = {
                                                        articleLDJSON.author
                                                    }
                                                    /> <
                                                    meta itemprop = "creator"
                                                    content = {
                                                        articleLDJSON.creator
                                                    }
                                                    /> <
                                                    meta itemprop = "headline"
                                                    content = {
                                                        articleLDJSON.headline
                                                    }
                                                    /> <
                                                    meta itemprop = "name"
                                                    content = {
                                                        articleLDJSON.name
                                                    }
                                                    /> <
                                                    span className = "hide"
                                                    itemprop = "publisher"
                                                    itemscope = {
                                                        true
                                                    }
                                                    itemtype = "http://schema.org/Organization" >
                                                    <
                                                    meta itemprop = "name"
                                                    content = {
                                                        publisherLDJSON.name
                                                    }
                                                    /> <
                                                    meta itemprop = "logo"
                                                    content = {
                                                        publisherLDJSON.logo && publisherLDJSON.logo.url
                                                    }
                                                    /> <
                                                    /span> {
                                                        gif && < DetectContextMenuWrapper callback = {
                                                                this.onGifContainerContextMenu
                                                            } >
                                                            <
                                                            div
                                                        id = "single-gif-container"
                                                        ref = {
                                                                this.setGifContainer
                                                            } >
                                                            {!showVideo && countryAllowed && < div
                                                                itemprop = 'image'
                                                                itemscope = {
                                                                    true
                                                                }
                                                                itemtype = 'http://schema.org/ImageObject' >
                                                                <
                                                                meta itemprop = "keywords"
                                                                content = {
                                                                    gifLDJSON.keywords
                                                                }
                                                                /> <
                                                                meta itemprop = "dateCreated"
                                                                content = {
                                                                    gifLDJSON.dateCreated
                                                                }
                                                                /> <
                                                                meta itemprop = "uploadDate"
                                                                content = {
                                                                    gifLDJSON.uploadDate
                                                                }
                                                                /> <
                                                                meta itemprop = "author"
                                                                content = {
                                                                    gifLDJSON.author
                                                                }
                                                                /> <
                                                                meta itemprop = "creator"
                                                                content = {
                                                                    gifLDJSON.creator
                                                                }
                                                                /> <
                                                                meta itemprop = "embedUrl"
                                                                content = {
                                                                    gifLDJSON.embedUrl
                                                                }
                                                                /> <
                                                                meta itemprop = "representativeOfPage"
                                                                content = {
                                                                    gifLDJSON.representativeOfPage ? 'true' : 'false'
                                                                }
                                                                /> <
                                                                meta itemprop = "url"
                                                                content = {
                                                                    gifLDJSON.url
                                                                }
                                                                /> <
                                                                meta itemprop = "duration"
                                                                content = {
                                                                    articleLDJSON.video ? articleLDJSON.video.duration : ''
                                                                }
                                                                /> <
                                                                meta itemprop = "contentUrl"
                                                                content = {
                                                                    gifLDJSON.contentUrl
                                                                }
                                                                /> <
                                                                meta itemprop = "width"
                                                                content = {
                                                                    gifLDJSON.width
                                                                }
                                                                /> <
                                                                meta itemprop = "height"
                                                                content = {
                                                                    gifLDJSON.height
                                                                }
                                                                /> <
                                                                Gif
                                                                gif = {
                                                                    gif
                                                                }
                                                                quality = {
                                                                    gifQuality
                                                                }
                                                                width = {
                                                                    this.state.width
                                                                }
                                                                height = {
                                                                    this.state.height
                                                                }
                                                                style = {
                                                                    style
                                                                }
                                                                mediaStyle = {
                                                                    mediaStyle
                                                                }
                                                                onCompletedGif = {
                                                                    this.onCompletedGif
                                                                }
                                                                /> <
                                                                /div>}

                                                                {
                                                                    showVideo && countryAllowed && < div
                                                                    itemprop = 'video'
                                                                    itemscope = {
                                                                        true
                                                                    }
                                                                    itemtype = 'http://schema.org/VideoObject' >
                                                                        <
                                                                        meta itemprop = "keywords"
                                                                    content = {
                                                                        videoLDJSON.keywords
                                                                    }
                                                                    /> <
                                                                    meta itemprop = "dateCreated"
                                                                    content = {
                                                                        videoLDJSON.dateCreated
                                                                    }
                                                                    /> <
                                                                    meta itemprop = "uploadDate"
                                                                    content = {
                                                                        videoLDJSON.uploadDate
                                                                    }
                                                                    /> <
                                                                    meta itemprop = "author"
                                                                    content = {
                                                                        videoLDJSON.author
                                                                    }
                                                                    /> <
                                                                    meta itemprop = "creator"
                                                                    content = {
                                                                        videoLDJSON.creator
                                                                    }
                                                                    /> <
                                                                    meta itemprop = "embedUrl"
                                                                    content = {
                                                                        videoLDJSON.embedUrl
                                                                    }
                                                                    /> <
                                                                    meta itemprop = "representativeOfPage"
                                                                    content = {
                                                                        videoLDJSON.representativeOfPage ? 'true' : 'false'
                                                                    }
                                                                    /> <
                                                                    meta itemprop = "url"
                                                                    content = {
                                                                        videoLDJSON.url
                                                                    }
                                                                    /> <
                                                                    meta itemprop = "duration"
                                                                    content = {
                                                                        articleLDJSON.video ? articleLDJSON.video.duration : ''
                                                                    }
                                                                    /> <
                                                                    meta itemprop = "contentUrl"
                                                                    content = {
                                                                        videoLDJSON.contentUrl
                                                                    }
                                                                    /> <
                                                                    meta itemprop = "width"
                                                                    content = {
                                                                        videoLDJSON.width
                                                                    }
                                                                    /> <
                                                                    meta itemprop = "height"
                                                                    content = {
                                                                        videoLDJSON.height
                                                                    }
                                                                    />

                                                                    {
                                                                        gif.hasaudio && < input className = "mute-button"
                                                                        type = "image"
                                                                        onClick = {
                                                                            this.toggleMute
                                                                        }
                                                                        src = {
                                                                            this.state.muted ? '/assets/img/icons/mute.svg' : '/assets/img/icons/sound.svg'
                                                                        }
                                                                        width = "46"
                                                                        height = "46" / >
                                                                    } <
                                                                    Gif
                                                                    gif = {
                                                                        gif
                                                                    }
                                                                    quality = {
                                                                        MEDIA_QUALITY.VIDEO
                                                                    }
                                                                    initialQuality = {
                                                                        MEDIA_QUALITY.VIDEO
                                                                    }
                                                                    muted = {
                                                                        this.state.muted
                                                                    }
                                                                    width = {
                                                                        this.state.width
                                                                    }
                                                                    height = {
                                                                        this.state.height
                                                                    }
                                                                    style = {
                                                                        style
                                                                    }
                                                                    mediaStyle = {
                                                                        mediaStyle
                                                                    }
                                                                    /> <
                                                                    /div>}

                                                                    {
                                                                        !countryAllowed && < div > < GifRestrictedMessage
                                                                        width = {
                                                                            this.state.width
                                                                        }
                                                                        height = {
                                                                            this.state.height
                                                                        }
                                                                        /></div > /* needs to be wrapped in a div to avoid rendering bug. */
                                                                    } <
                                                                    /div> <
                                                                    /DetectContextMenuWrapper> } <
                                                                    /div> {
                                                                        gif && < div className = "gif-details-container" >
                                                                            <
                                                                            div className = "gif-actions" >
                                                                            <
                                                                            div className = "extra-controls" > {
                                                                                showQualityToggle &&
                                                                                <
                                                                                QualityToggle
                                                                                gifLoaded = {
                                                                                    this.state.gifLoaded
                                                                                }
                                                                                gifPage = {
                                                                                    this
                                                                                }
                                                                                gifQuality = {
                                                                                    gifQuality
                                                                                }
                                                                                gif = {
                                                                                    gif
                                                                                }
                                                                                />
                                                                            } {
                                                                                allowCaptioning &&
                                                                                    <
                                                                                    Link
                                                                                to = "/gif-maker?utm_source=gif-caption&utm_medium=internal&utm_campaign=gif-maker-entrypoints"
                                                                                className = "caption-gif-button"
                                                                                clickLabel = "caption-gif-button"
                                                                                onClick = {
                                                                                        this.setGifMakerInitialState
                                                                                    } >
                                                                                    {
                                                                                        gettextSub('CAPTION')
                                                                                    } <
                                                                                    /Link>
                                                                            }

                                                                        {
                                                                            allowFavoriting &&
                                                                                <
                                                                                GifFavButton gif = {
                                                                                    gif
                                                                                }
                                                                            />
                                                                        }

                                                                        {
                                                                            this.isStaticImage &&
                                                                                <
                                                                                FlagIcon gif = {
                                                                                    gif
                                                                                }
                                                                            />
                                                                        } {
                                                                            showStaticImageInfoIcon &&
                                                                                <
                                                                                StaticImageInfoIcon type = 'item-view' / >
                                                                        } <
                                                                        /div> <
                                                                        div className = {
                                                                                `gif-actions-horizontal-spacer${isMobile() ? ' isMobile' : ''}`
                                                                            } > {
                                                                                showAuthor && username && < TwgCounter username = {
                                                                                    username
                                                                                }
                                                                                title = {
                                                                                    this.h1_title
                                                                                }
                                                                                />} <
                                                                                /div> {
                                                                                    showAuthor && username ? < div className = "profile-info" >
                                                                                        <
                                                                                        ProfileImage user = {
                                                                                            gif.user
                                                                                        }
                                                                                    disableLinkToProfile = {
                                                                                        this.profileLinkingDisabled(gif)
                                                                                    }
                                                                                    /> <
                                                                                    Link className = "author-username"
                                                                                    rel = "author"
                                                                                    to = {
                                                                                        this.linkToProfile(gif.user)
                                                                                    }
                                                                                    disabled = {
                                                                                            this.profileLinkingDisabled(gif)
                                                                                        } > {
                                                                                            gif.user.username
                                                                                        } <
                                                                                        /Link> <
                                                                                        OfficialBadge flags = {
                                                                                            gif.user.flags
                                                                                        }
                                                                                    tooltip = {
                                                                                        true
                                                                                    }
                                                                                    /> <
                                                                                    /div> : <div className="profile-info"/ >
                                                                                } <
                                                                                /div>

                                                                                {
                                                                                    this.isStaticImage && < div className = "gif-details vertical-spacer" / >
                                                                                }

                                                                                {
                                                                                    showSharingOptions &&
                                                                                        <
                                                                                        div className = "gif-details share-buttons" > {
                                                                                            this.shareButtons && Object.keys(this.shareButtons).map((key) => {
                                                                                                const data = this.shareButtons[key];
                                                                                                return <ShareIcon key = {
                                                                                                    key
                                                                                                }
                                                                                                service = {
                                                                                                    key
                                                                                                }
                                                                                                title = {
                                                                                                    this.title
                                                                                                }
                                                                                                onClick = {
                                                                                                    this.onShareIconClick
                                                                                                } { ...data
                                                                                                }
                                                                                                />;
                                                                                            })
                                                                                        } <
                                                                                        FlagIcon gif = {
                                                                                            gif
                                                                                        }
                                                                                    /> <
                                                                                    /div>
                                                                                }

                                                                                {
                                                                                    showTags &&
                                                                                        <
                                                                                        ul className = "tag-list list-unstyled"
                                                                                    style = {
                                                                                            {
                                                                                                width: username ? '100%' : 'calc(100% - 200px)'
                                                                                            }
                                                                                        } > {
                                                                                            gif.tags.map((tag, i) => {
                                                                                                tag = cleanMultiwordTag(tag);
                                                                                                if (!tag) {
                                                                                                    // the cleaned tag might be an empty string.
                                                                                                    return;
                                                                                                }
                                                                                                return <li key = {
                                                                                                    i
                                                                                                } > < RelatedTag searchterm = {
                                                                                                    tag
                                                                                                }
                                                                                                name = {
                                                                                                    tag
                                                                                                }
                                                                                                /></li > ;
                                                                                            })
                                                                                        } <
                                                                                        /ul>
                                                                                }

                                                                                {
                                                                                    isMobile() && < TwgThankWall username = {
                                                                                        username
                                                                                    }
                                                                                    title = {
                                                                                        this.h1_title
                                                                                    }
                                                                                    />}

                                                                                    {
                                                                                        showSharingOptions &&
                                                                                            <
                                                                                            div className = "gif-details embed"
                                                                                        style = {
                                                                                                {
                                                                                                    display: (!isMobile() || this.state.showCopyBox) ? 'block' : 'none'
                                                                                                }
                                                                                            } >
                                                                                            <
                                                                                            h3 > {
                                                                                                gettextSub('Share URL')
                                                                                            } < /h3> <
                                                                                            Copybox
                                                                                        className = "share"
                                                                                        onClick = {
                                                                                            this.registerShare
                                                                                        }
                                                                                        value = {
                                                                                            fullURL(this.linkToView(gif))
                                                                                        }
                                                                                        /> <
                                                                                        br / >
                                                                                            <
                                                                                            br / >
                                                                                            <
                                                                                            h3 > {
                                                                                                gettextSub('Embed')
                                                                                            } < /h3> <
                                                                                            Copybox
                                                                                        className = "embed"
                                                                                        onClick = {
                                                                                            this.registerShare
                                                                                        }
                                                                                        value = {
                                                                                            gif.embed
                                                                                        }
                                                                                        /> <
                                                                                        /div>
                                                                                    }

                                                                                    {
                                                                                        showGifDetails &&
                                                                                            <
                                                                                            div className = "gif-details non-mobile-only" >
                                                                                            <
                                                                                            h3 > {
                                                                                                gettextSub('Details')
                                                                                            } < /h3> <
                                                                                            dl > {
                                                                                                detailsEls
                                                                                            } <
                                                                                            /dl> <
                                                                                            /div>
                                                                                    }

                                                                                    {
                                                                                        authService.userHasFlag('moderator') && < div className = "gif-details admin" >
                                                                                            <
                                                                                            h3 > {
                                                                                                gettextSub('Admin')
                                                                                            } < /h3> <
                                                                                            Link to = {
                                                                                                `https://www.riffsy.com/keyboard.post/${getV1PostId(gif)}`
                                                                                            }
                                                                                        blank = {
                                                                                                false
                                                                                            } > {
                                                                                                gettextSub('Edit')
                                                                                            } < /Link> <
                                                                                            h4 > mp4 < /h4> <
                                                                                            Copybox value = {
                                                                                                Gif.getFormatUrl(gif, 'mp4')
                                                                                            }
                                                                                        /> <
                                                                                        h4 > gif < /h4> <
                                                                                            Copybox value = {
                                                                                                Gif.getFormatUrl(gif, 'gif')
                                                                                            }
                                                                                        /> <
                                                                                        h4 > mediumgif < /h4> <
                                                                                            Copybox value = {
                                                                                                Gif.getFormatUrl(gif, 'mediumgif')
                                                                                            }
                                                                                        /> <
                                                                                        /div> } <
                                                                                        /div> } <
                                                                                        /div>

                                                                                        {
                                                                                            showRelatedGifs &&
                                                                                                <
                                                                                                div className = "related-gifs-container" > {!isMobile() && < TwgThankWall username = {
                                                                                                        username
                                                                                                    }
                                                                                                    title = {
                                                                                                        this.h1_title
                                                                                                    }
                                                                                                    />} <
                                                                                                    h3 > {
                                                                                                        gettextSub('Related GIFs')
                                                                                                    } < /h3> <
                                                                                                    GifList
                                                                                                    gifs = {
                                                                                                        relatedGifs
                                                                                                    }
                                                                                                    staticColumns = {!isMobile() ? 1 : undefined
                                                                                                    }
                                                                                                    /> <
                                                                                                    /div>
                                                                                                }

                                                                                                <
                                                                                                UpsellPill
                                                                                            text = {
                                                                                                gettextSub('Share from GIF Keyboard')
                                                                                            }
                                                                                            to = "https://apps.apple.com/app/apple-store/id917932200?pt=39040802&ct=viewpagev2&mt=8"
                                                                                            origin = 'itemview' /
                                                                                                >
                                                                                                <
                                                                                                /div>
                                                                                        );
                                                                                    }
                                                                                }