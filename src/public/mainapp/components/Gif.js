import {
    autobind
} from 'core-decorators';

import {
    Component
} from 'inferno'; // eslint-disable-line no-unused-vars
import {
    DataSource
} from '../../../replete';

import queue from 'async/queue';

import {
    CustomComponent
} from '../../common/components';
import {
    Icon
} from '../../common/components/Icon';
import {
    window,
    isMobile,
    isSticker
} from '../../common/util';
import {
    MEDIA_TYPE
} from './GifConstants';

import './Gif.scss';

const MEDIA_SIZES = {
    'gif': ['preview', 'nanogif', 'tinygif', 'mediumgif', 'gif'],
    'sticker': ['preview', 'tinygif_transparent', 'gif_transparent'],
};

const PREVIEW_MAPPING = {
    'gif': ['nanomp4', 'tinymp4', 'nanogif', 'tinygif'],
    'sticker': ['nanogif_transparent', 'tinygif_transparent', 'gif_transparent'],
};

export const MEDIA_QUALITY = Object.freeze({
    PREVIEW: 'preview',
    FALLBACK: 'fallback',
    TINY: 'tiny',
    SD: 'SD',
    HD: 'HD',
    VIDEO: 'video',
});

export const MEDIA_QUALITY_MAPPING = {
    'preview': {
        gif: 'preview',
        sticker: 'preview',
    },
    'fallback': {
        gif: 'tinygif',
        sticker: 'originalgif',
    },
    'tiny': {
        gif: 'tinygif',
        sticker: 'tinygif_transparent',
    },
    'SD': {
        gif: 'mediumgif',
        sticker: 'tinygif_transparent',
    },
    'HD': {
        gif: 'gif',
        sticker: 'gif_transparent',
    },
    'video': {
        gif: ['mp4', 'webm'],
        sticker: null, // mp4 does not support transparency
    },
};

function loadImgSrc(src, cb) {
    const el = new Image();
    el.addEventListener('load', cb);
    el.addEventListener('error', cb);
    el.src = src;
    return el;
}

const queuedLoadImgSrc = queue(loadImgSrc, 2);
queuedLoadImgSrc.pause();

function addToQueuedLoadImgSrc(src, cb) {
    // Need to account for duplicates in the stream and users scrolling back up.
    queuedLoadImgSrc.remove(function({
        data
    }) {
        return src === data;
    });
    queuedLoadImgSrc.unshift(src, cb);
}

// Need to keep track of pending previews, only load gifs when it's 0
let pendingPreviewsCount = 0;

function previewLoaded() {
    pendingPreviewsCount--;
    if (pendingPreviewsCount <= 0) {
        queuedLoadImgSrc.resume();
    }
}

function trackPreviewLoad(el) {
    if (!el.completele) {
        pendingPreviewsCount++;
        queuedLoadImgSrc.pause();
        el.addEventListener('load', previewLoaded);
        el.addEventListener('error', previewLoaded);
    }
}

let listeningForHistoryChange = false;

// TODO:
// Need this for tags too


function selectUrl(gif, size) {
    const media = gif.media[0];
    const mediaType = Gif.getMediaType(gif);
    // Sometimes media formats are missing.
    if (size === 'preview') {
        for (const previewSize of PREVIEW_MAPPING[mediaType]) {
            const selectedMedia = media[previewSize];
            if (Gif.hasFormat(gif, previewSize)) {
                return selectedMedia.preview ? selectedMedia.preview : selectedMedia.url;
            }
        }
    }

    if (Gif.hasFormat(gif, size)) {
        return Gif.getFormatUrl(gif, size);
    } else {
        // NOTE: the GifMakerEntrypoint card in searchpage GifLists only has the 'tinygif' format
        const fallbackSize = MEDIA_QUALITY_MAPPING[MEDIA_QUALITY.FALLBACK][mediaType];
        if (Gif.hasFormat(gif, fallbackSize)) {
            return Gif.getFormatUrl(gif, fallbackSize);
        } else {
            console.error(`Missing Format: ${size}, no fallback for ${gif.id}`);
            // NB: Deliberately returning an invalid URL to ensure a broken image icon is rendered
            return `""`;
        }
    }
}

export class DataSaverModeDataSource extends DataSource {
    // a bug in replete requires everything to have a DataSource
    getInitial() {
        return false;
    }
}
export class GifImgSizesDataSource extends DataSource {
    key([gif]) {
        return gif.id;
    }
    getInitial([gif]) {
        const val = {};
        this.set([gif], val);
        return val;
    }
}


export class Gif extends CustomComponent {
    constructor(props, context) {
        super(props, context);
        this.handleNewGif(this.props, this.state);
        // FIXME: I hate having this here.
        // empty queue on page transition
        if (!listeningForHistoryChange) {
            listeningForHistoryChange = true;
            this.context.router.history.listen(function() {
                console.log('removing queued items', queuedLoadImgSrc.length());
                queuedLoadImgSrc.remove(function() {
                    return true;
                });
                pendingPreviewsCount = 0;
            });
        }
    }

    componentWillUnmount() {
        window.removeEventListener('scroll', this.trackVisibility);
    }

    componentWillUpdate(nextProps, nextState) {
        if (nextProps.gif.id !== this.props.gif.id) {
            window.removeEventListener('scroll', this.trackVisibility);
            this.handleNewGif(nextProps, nextState);
        }
        if (nextProps.quality !== this.props.quality) {
            this.setLoadedSrc(nextProps, nextProps.gif, this.getSize(nextProps.quality), true);
        }
    }

    handleNewGif(props, state) {
        if (props.onNewGifSet) {
            props.onNewGifSet(props.gif);
        }
        const {
            gif,
            quality,
            initialQuality
        } = props;
        this.isSticker = isSticker(gif);
        this.mediaType = Gif.getMediaType(gif);

        state.renderSize = '';
        this.size = quality ? this.getSize(quality) : 'auto';

        this.inViewport = false;
        this.hasBeenOutsideViewport = true;
        this.adTrackingStarted = false;

        if (this.element) {
            // Instantly clear previous image. Prevents it from showing during
            // transition to new image.
            this.element.src = '';
        }

        const initialSize = this.getInitialSize(initialQuality);
        const size = this.size;

        if (process.env.BROWSER && quality !== MEDIA_QUALITY.VIDEO) {
            // initialGif is used to track whether this Component is for the
            // same GIF and if we should update the src.
            // These components seem to get reused for different GIFs, which causes bugs.
            this.state.renderSize = this.loadSrc(gif, initialSize, () => {
                this.setLoadedSrc(props, gif, initialSize);
                if (size !== initialSize) {
                    // we only want to use the queue when preview was requested
                    this.loadSrc(gif, size, () => {
                        this.onCompletedGif();
                        this.setLoadedSrc(props, gif, size);
                    }, initialSize === 'preview');
                } else {
                    this.onCompletedGif();
                }
            });
        } else if (initialSize === 'preview') {
            // show the initial URL on server
            this.setLoadedSrc(props, gif, initialSize, true);
            this.onCompletedGif();
        } else {
            // just show the final URL on server
            this.setLoadedSrc(props, gif, size, true);
            this.onCompletedGif();
        }
    }

    getSize(quality) {
        return MEDIA_QUALITY_MAPPING[quality][this.mediaType];
    }

    getInitialSize(initialQuality) {
        const fetchedSizes = this.context.store.get('ui.gifSizes.*', [this.props.gif]) || {};
        const mediaSizes = MEDIA_SIZES[this.mediaType];

        if (fetchedSizes[this.size]) {
            // The final size is already loaded, so just use it.
            return this.size;
        }

        if (initialQuality) {
            return MEDIA_QUALITY_MAPPING[initialQuality][this.mediaType];
        }

        if (!initialQuality) {
            // initialSizeIdx starts at 1 because we don't want to autoselect previews
            let initialSizeIdx = 1;
            for (let idx = initialSizeIdx; idx < mediaSizes.length; idx++) {
                if (fetchedSizes[mediaSizes[idx]]) {
                    initialSizeIdx = idx;
                }
            }
            return mediaSizes[initialSizeIdx];
        }
    }

    onCompletedGif() {
        const {
            onCompletedGif
        } = this.props;
        process.env.BROWSER && onCompletedGif ? onCompletedGif() : null;
    }

    loadSrc(gif, size, cb, queued) {
        const src = selectUrl(gif, size);

        if (queued) {
            // new .gifs get priority since they're in view.
            addToQueuedLoadImgSrc(src, cb);
        } else {
            const el = loadImgSrc(src, cb);
            if (size === 'preview') {
                trackPreviewLoad(el);
            }
        }
        return size;
    }

    setLoadedSrc(props, gif, size, sync) {
        // Only update if the GIF ID still matches, since it could have changed.
        // Don't need to update store if gif is a card. (eg. gifmaker entry point)
        if (gif.id === props.gif.id && !gif.isCard) {
            if (MEDIA_SIZES[this.mediaType].includes(size)) {
                this.context.store.set(`ui.gifSizes.*.${size}`, [gif], true);
            }
            if (sync) {
                this.state.renderSize = size;
            } else {
                this.setState({
                    renderSize: size
                });
            }
        }
    }

    @autobind
    setElement(element) {
        this.element = element;
        if (element) {
            element.addEventListener('load', this.trackIfAd);
        }
    }

    @autobind
    setVideoElement(element) {
        this.videoElement = element;
        if (element) {
            element.addEventListener('canplay', this.trackIfAd);
        }
    }

    @autobind
    trackIfAd() {
        if (this.adTrackingStarted) {
            return;
        }
        this.adTrackingStarted = true;
        // Only track ads (GIFs with source_id and feature_info)
        if (this.props.gif.source_id && this.props.gif.feature_info) {
            this.trackVisibility();
            window.addEventListener('scroll', this.trackVisibility);
        }
    }

    @autobind
    trackVisibility() {
        /*
        When an ad has been completely outside the viewport (due to having not been
        rendered yet, or being scrolled out of view) and then becomes completely
        visible again, record a view. Being partially out of view doesn't count as
        either being in the viewport or completely outside it.
        */
        let element;
        if (this.element) {
            element = this.element;
        } else if (this.videoElement) {
            element = this.videoElement;
        } else {
            this.inViewport = false;
            return;
        }

        const rect = element.getBoundingClientRect();
        const navbar = window.document.getElementsByClassName('TopBar');
        const navbarOffset = navbar.length ? navbar[0].clientHeight : 0;
        const footerOffset = 0;

        // ad completely within viewport
        if (rect.top >= navbarOffset &&
            rect.left >= 0 &&
            rect.bottom <= window.innerHeight - footerOffset &&
            rect.right <= window.innerWidth) {
            this.inViewport = true;
        } else {
            this.inViewport = false;
        }
        // ad completely outside viewport
        if (rect.top > window.innerHeight - footerOffset ||
            rect.left > window.innerWidth ||
            rect.bottom < navbarOffset ||
            rect.right < 0) {
            this.hasBeenOutsideViewport = true;
        }

        if (this.hasBeenOutsideViewport && this.inViewport) {
            this.hasBeenOutsideViewport = false;
            this.context.apiService.registerAdinViewport(this.props.gif);
        }
    }

    static getStickerPadding() {
        return isMobile() ? 8 : 12;
    }

    static hasFormat(gif, format) {
        return Boolean(gif && gif.media && gif.media[0] && gif.media[0][format]);
    }

    static getFormat(gif, format) {
        return Gif.hasFormat(gif, format) ? gif.media[0][format] : undefined;
    }

    static getMediaType(gif) {
        if (isSticker(gif)) {
            return MEDIA_TYPE.STICKER;
        } else {
            return MEDIA_TYPE.GIF;
        }
    }

    static getFormatParam(gif, format, param) {
        return Gif.hasFormat(gif, format) ? gif.media[0][format][param] : undefined;
    }

    static getFormatUrl(gif, format) {
        return Gif.getFormatParam(gif, format, 'url');
    }

    static getFormatDims(gif, format) {
        return Gif.getFormatParam(gif, format, 'dims');
    }

    render() {
        let {
            gif,
            quality,
            width,
            height,
            style,
            mediaStyle,
            muted,
            ...otherProps
        } = this.props;
        // Don't render this attribute
        delete otherProps['initialQuality'];
        style = style || {};
        mediaStyle = mediaStyle || {};
        mediaStyle['backgroundColor'] = gif.bg_color;

        if (quality === MEDIA_QUALITY.VIDEO) {
            if (this.videoElement) {
                console.log('has videoElement');
                // Needed in case source or other settings changed in-place.
                window.setTimeout(() => {
                    if (this.videoElement) {
                        const src = this.videoElement.currentSrc;
                        if (src !== Gif.getFormatUrl(gif, 'mp4') && src !== Gif.getFormatUrl(gif, 'webm')) {
                            console.log('src doesn\'t match');
                            this.videoElement.load();
                        }
                    }
                }, 0);
            }
            // Note: preload=none tends to get ignored.
            console.log('video render', width, height);
            this.context.response.preload(Gif.getFormatUrl(gif, 'mp4'), 'video', false);

            return ( <
                div className = {
                    `Gif`
                }
                style = {
                    style
                }
                onTouchStart = {
                    () => {
                        this.setState({
                            touched: true
                        });
                    }
                }
                onTouchEnd = {
                    () => {
                        this.setState({
                            touched: false
                        });
                    }
                }
                onTouchCancel = {
                    () => {
                        this.setState({
                            touched: false
                        });
                    }
                } { ...otherProps
                } >
                <
                video ref = {
                    this.setVideoElement
                }
                muted = {
                    muted !== false
                }
                width = {
                    width
                }
                height = {
                    height
                }
                loop = {
                    true
                }
                autoplay = {
                    true
                }
                preload = {
                    'auto'
                }
                style = {
                    mediaStyle
                }
                // iOS bullshit to prevent video from automatically entering full screen
                playsinline = {
                    true
                } >
                {
                    Gif.hasFormat(gif, 'mp4') && < source src = {
                        Gif.getFormatUrl(gif, 'mp4')
                    }
                    type = "video/mp4" / >
                } {
                    Gif.hasFormat(gif, 'webm') && < source src = {
                        Gif.getFormatUrl(gif, 'webm')
                    }
                    type = "video/webm" / >
                } <
                /video> <
                /div>
            );
        } else {
            // See if onLoad event can be used for image load detection.
            const src = selectUrl(gif, this.state.renderSize);

            let stickerWidth;
            let stickerHeight;
            let stickerStyle = {};
            if (this.isSticker && Gif.hasFormat(gif, this.state.renderSize)) {
                const dims = Gif.getFormatDims(gif, this.state.renderSize) || [100, 100];
                const aspectRatio = dims[0] / dims[1];
                const padding = Gif.getStickerPadding();
                if (width && height) {
                    width = width - padding * 2;
                    height = height - padding * 2;
                    if (aspectRatio >= 1) {
                        stickerWidth = width;
                        stickerHeight = height / aspectRatio;
                        stickerStyle = {
                            marginTop: `${.5 * (height - stickerHeight) + padding}px`,
                            marginBottom: `${.5 * (height - stickerHeight) + padding}px`,
                            marginLeft: `${padding}px`,
                            marginRight: `${padding}px`,
                        };
                    } else {
                        stickerWidth = width * aspectRatio;
                        stickerHeight = width;
                        stickerStyle = {
                            marginTop: `${padding}px`,
                            marginBottom: `${padding}px`,
                            marginLeft: `${.5 * (width - stickerWidth) + padding}px`,
                            marginRight: `${.5 * (width - stickerWidth) + padding}px`,
                        };
                    }
                }
                mediaStyle['backgroundColor'] = 'unset';
                Object.assign(mediaStyle, stickerStyle);
            }

            return ( <
                div className = {
                    `${this.isSticker ? 'Sticker' : 'Gif'} ${this.state.touched ? 'touched' : ''}`
                }
                style = {
                    style
                }
                onTouchStart = {
                    () => {
                        this.setState({
                            touched: true
                        });
                    }
                }
                onTouchEnd = {
                    () => {
                        this.setState({
                            touched: false
                        });
                    }
                }
                onTouchCancel = {
                    () => {
                        this.setState({
                            touched: false
                        });
                    }
                } { ...otherProps
                } >
                {
                    this.state.renderSize === 'preview' && < Icon name = "spinner"
                    spin = {
                        true
                    }
                    />} <
                    img
                    ref = {
                        this.setElement
                    }
                    src = {
                        src
                    }
                    width = {
                        this.isSticker ? stickerWidth : width
                    }
                    height = {
                        this.isSticker ? stickerHeight : height
                    }
                    alt = {
                        src ? gif.long_title : ''
                    }
                    style = {
                        mediaStyle
                    }
                    /> <
                    /div>
                );
            }
        }
    }