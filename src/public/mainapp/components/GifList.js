import {
    autobind
} from 'core-decorators';

import emitter from 'tiny-emitter/instance';

import {
    Component
} from 'inferno'; // eslint-disable-line no-unused-vars

import mathService from '../services/mathService';
import {
    CustomComponent,
    Link
} from '../../common/components';
import {
    StaticImageInfoIcon
} from './StaticImageInfoIcon';
import {
    PRIVATE_CONSTANTS
} from '../../common/config';
import {
    cleanMultiwordTag,
    getCanonicalPostId,
    gifCountryAllowed,
    isStatic,
    isStaticImage,
    isSticker,
    window
} from '../../common/util';
import {
    GifFavButton
} from '../components/GifFavButton';
import {
    Gif,
    MEDIA_QUALITY
} from './Gif';

import './GifList.scss';


// These prefixes are esitmated to account for ~1% of searches.
const STATIC_PREVIEW_TEST_PATH_PREFIXES = [
    '/search/happybirthday',
    '/search/good-morning-kiss',
    '/search/love-you',
    '/search/good-night-sweet-dreams',
    '/search/buenos-dias',
];

function isStaticPreview(path) {
    for (const prefix of STATIC_PREVIEW_TEST_PATH_PREFIXES) {
        if (path.startsWith(prefix)) {
            return true;
        }
    }
    return false;
}


function makeSlice(ary, start, num) {
    const slice = [];
    let max = start + num;
    if (max > ary.length) {
        max = ary.length;
    }

    for (let index = start; index < max; index++) {
        slice.push({
            'index': index,
            'gif': ary[index],
        });
    }
    return slice;
}


export class GifListItem extends CustomComponent {
    @autobind
    reuseGifData() {
        // When a GIF is selected, we want to keep its source_id, so we need to
        // avoid refetching it from the API.
        // If the same GIF shows up in another stream, the old cache data should
        // get overwritten here if it's clicked.
        const val = {
            loaded: true,
            pending: false,
            results: [this.props.gif],
        };
        val.promise = Promise.resolve(val);
        const id = getCanonicalPostId(this.props.gif);
        this.context.store.set('api.gifs.byId.*', [id], val);
    }
    makeTagAnchors(tags) {
        const ary = [];
        const maxLen = 4;
        let len = tags.length;
        const maxChars = 30;
        let numChars = 0;
        let tag;
        if (len > maxLen) {
            len = maxLen;
        }
        for (let i = 0; i < len; i++) {
            numChars += tags[i].length;
            if (numChars > maxChars) {
                break;
            }
            tag = cleanMultiwordTag(tags[i]);
            if (tag) {
                ary.push( < li > < Link to = {
                    this.linkToSearch(tag)
                } > {
                    `#${tag.replace(/ /g, '-')}`
                } < /Link></li > );
            }
        }
        return ary;
    }
    render() {
            const gettextSub = this.context.gtService.gettextSub;
            const gif = this.props.gif;
            const showGifFaveButton = !isSticker(gif) && !isStatic(gif) && gif.id && !gif.unprocessed;
            const showStaticImageInfoIcon = this.context.featureFlags.staticImageBetaEnabled && isStaticImage(gif);
            const dims = Gif.getFormatDims(gif, 'tinygif') || [undefined, undefined];

            return ( <
                figure className = "GifListItem"
                data - index = {
                    this.props.index
                }
                data - col - index = {
                    gif.details.colIndex
                }
                data - width = {
                    dims[0]
                }
                data - height = {
                    dims[1]
                }
                style = {
                    {
                        top: `${gif.details.y}px`
                    }
                } >
                <
                Link to = {
                    gif.itemurl ? this.linkToView(gif) : undefined
                }
                onClick = {
                    this.reuseGifData
                } >
                <
                Gif gif = {
                    gif
                }
                quality = {
                    MEDIA_QUALITY.TINY
                }
                initialQuality = {
                    this.props.showStaticPreview ? MEDIA_QUALITY.PREVIEW : undefined
                }
                width = {
                    gif.details.width
                }
                height = {
                    gif.details.height
                }
                /> {
                    gif.ad_badge_info && gif.ad_badge_info.badges.length && < img
                    className = {
                        `badge pos-${gif.ad_badge_info.badges[0].position}`
                    }
                    src = {
                        gif.ad_badge_info.badges[0].url
                    }
                    width = {
                        gif.ad_badge_info.badges[0].dims[0] / 2
                    }
                    height = {
                        gif.ad_badge_info.badges[0].dims[1] / 2
                    }
                    />} <
                    div className = "overlay" / >
                        <
                        /Link> {
                            showGifFaveButton &&
                                <
                                div className = "actions" >
                                <
                                GifFavButton gif = {
                                    gif
                                }
                            /> <
                            /div>
                        } {
                            showStaticImageInfoIcon &&
                                <
                                div className = "actions" >
                                <
                                StaticImageInfoIcon type = 'giflist' / >
                                <
                                /div>
                        } <
                        figcaption className = "tags" >
                        <
                        ul className = "list-unstyled" > {
                            this.makeTagAnchors(gif.tags)
                        } < /ul> <
                        /figcaption> {
                            gif.unprocessed && < div className = "unprocessed-overlay" >
                                <
                                span > {
                                    gettextSub('Processing Upload…')
                                } < /span> <
                                /div>} <
                                /figure>
                        );
                }
            }


            export class GifList extends CustomComponent {
                constructor(props, context) {
                    super(props, context);

                    this.element = null;
                    this.setLayout();
                    this.extra = 3;

                    this.state.start = 0;
                    this.state.num = 0;
                    this.state.computedLayout = {
                        loaderHeight: 0,
                        columns: 2
                    };
                    this.state.emptyQuery = false;
                    this.state.gifColumns = [];

                    this.addCardsIfNeeded(this.props);

                    this.setEmptyQuery(this.props, this.state);

                    this.setGifListSliceIfNeeded(this.props, this.state);
                }
                componentWillUpdate(nextProps, nextState) {
                    let newLayout = false;
                    if (this.props.staticColumns !== nextProps.staticColumns) {
                        this.setLayout(nextProps);
                        newLayout = true;
                    }
                    this.addCardsIfNeeded(nextProps);
                    if (newLayout || this.props.processedGifs != nextProps.processedGifs) {
                        nextState.computedLayout = this.layout.compute(nextProps.processedGifs, true);
                        this.setGifListSliceIfNeeded(nextProps, nextState);
                    }

                    if (this.props.query != nextProps.query) {
                        this.setEmptyQuery(nextProps, nextState);
                    }
                }
                componentDidMount() {
                    window.addEventListener('scroll', this.handleScroll);
                    window.addEventListener('resize', this.handleResize);
                }
                componentWillUnmount() {
                    window.removeEventListener('scroll', this.handleScroll);
                    window.removeEventListener('resize', this.handleResize);
                }
                @autobind
                handleScroll() {
                    this.setGifListSliceIfNeeded(this.props, this.state);
                }
                @autobind
                handleResize() {
                    this.setState({
                        computedLayout: this.layout.compute(this.props.processedGifs, true)
                    });
                    this.setGifListSliceIfNeeded(this.props, this.state);
                }
                setLayout(props) {
                    props = props || this.props;
                    this.layout = mathService({
                        element: this.element,
                        staticColumns: props.staticColumns,
                    });
                }
                @autobind
                setElement(element) {
                    this.element = element;
                    this.setLayout();
                    this.setGifListSliceIfNeeded(this.props, this.state);
                }
                addCardsIfNeeded(props) {
                    if (!props.processedGifs) {
                        // we don't want to edit the original list in place.
                        props.processedGifs = props.gifs.filter((gif) => {
                            return gifCountryAllowed(gif, this.context);
                        });
                        if (props.addGifMakerEntrypoint && props.processedGifs.length >= 16) {
                            props.processedGifs.splice(16, 0, {
                                isCard: true,
                                itemurl: 'https://tenor.com/gif-maker?utm_source=search-page&utm_medium=internal&utm_campaign=gif-maker-entrypoints',
                                tags: [],
                                media: [{
                                    tinygif: {
                                        url: `/assets/img/gif-maker-entrypoints/search-entrypoint-optimized.gif`,
                                        dims: [516, 715],
                                    },
                                }],
                            });
                        }
                    }
                }
                setEmptyQuery(props, state) {
                    const query = 'query' in props ? props.query : null;
                    if (query) {
                        state.emptyQuery = !query.length;
                    }
                }
                @autobind
                setGifListSliceIfNeeded(props, state) {
                    // TODO: might be best to always call layout.compute here, using a flag
                    // for if this.props.gifs has been updated.
                    const oldNum = state.num;
                    const oldStart = state.start;
                    let start = oldStart;
                    let num = oldNum;

                    if (process.env.BROWSER) {
                        const startAndNum = this.updateStartAndNum(props, state);
                        if (startAndNum) {
                            start = startAndNum[0];
                            num = startAndNum[1];
                        }
                    } else {
                        start = 0;
                        // Show everything we have
                        num = props.processedGifs.length;
                    }

                    if (start === oldStart && num === oldNum) {
                        // nothing's changed
                        return;
                    }
                    this.setGifListSlice(start, num);
                }
                setGifListSlice(start, num) {
                    this.state.start = start;
                    this.state.num = num;
                    this.triggerUpdate();
                }
                setGifList() {
                    if (this.props.processedGifs && this.props.processedGifs.length) {
                        this.setState({
                            computedLayout: this.layout.compute(this.props.processedGifs)
                        });
                        this.setGifListSliceIfNeeded(this.props, this.state);
                    }
                }
                updateStartAndNum(props, state) {
                    if (!this.element) {
                        return;
                    }
                    const boundingRect = this.element.getBoundingClientRect();
                    const elementTop = boundingRect.top + window.pageYOffset;
                    const viewportTop = window.pageYOffset;
                    const viewportBottom = viewportTop + window.innerHeight;
                    const gifList = props.processedGifs;
                    let start = 0;
                    let num = state.num;

                    if (!gifList) {
                        return;
                    }

                    if (gifList.length && gifList[0].details) {
                        let i = 0;
                        for (; i < gifList.length; i++) {
                            // if the bottom of this element is above the top of the viewport
                            if ((gifList[i].details.y + gifList[i].details.height) + elementTop > viewportTop) {
                                start = i;
                                break;
                            }
                        }
                        num = gifList.length - start;
                        for (; i < gifList.length; i++) {
                            // if the top of this element is below the bottom of the viewport
                            if (gifList[i].details.y + elementTop > viewportBottom) {
                                num = i - start;
                                break;
                            }
                        }
                    }


                    start -= this.state.computedLayout.numColumns;
                    num += this.state.computedLayout.numColumns;

                    // render a few extra elements, but only after the first few
                    // have had a chance to load.
                    num += 2 * this.extra;
                    start -= this.extra;
                    if (start < 0) {
                        // set start to 0, but keep ending index the same.
                        num += start;
                        start = 0;
                    }
                    if (start + num >= (gifList.length - 10)) {
                        // trigger event when we're close to end of list.
                        emitter.emit('list-items-exhausted');
                        this.props.itemsExhaustedCallback && this.props.itemsExhaustedCallback();
                    }
                    return [start, num];
                }
                render() {
                        const gettextSub = this.context.gtService.gettextSub;

                        // May need to call this.layout.compute in case this.props.gifs
                        // gets updated in place and new GIFs don't have details. This function
                        // will continue where it left off.
                        this.state.computedLayout = this.layout.compute(this.props.processedGifs);

                        let gifListSlice;
                        const gifColumns = [];

                        if (process.env.BROWSER) {
                            gifListSlice = makeSlice(this.props.processedGifs, this.state.start, this.state.num);
                        } else {
                            gifListSlice = makeSlice(this.props.processedGifs, 0, this.props.gifs.length);
                        }

                        for (let i = gifColumns.length; i < this.state.computedLayout.numColumns; i++) {
                            gifColumns.push([]);
                        }

                        for (const item of gifListSlice) {
                            gifColumns[item.gif.details.column].push(item);
                        }

                        const gifColumnsElements = [];
                        let gifColumn;
                        const showStaticPreview = isStaticPreview(this.context.router.history.location.pathname);
                        for (let gifColumnIdx = 0; gifColumnIdx < gifColumns.length; gifColumnIdx++) {
                            gifColumn = gifColumns[gifColumnIdx];

                            // NOTE: `hasKeyedChildren` is Inferno specific, but `key` is not.
                            gifColumnsElements.push( < div className = {
                                    'column'
                                }
                                $HasKeyedChildren = {
                                    true
                                } > {
                                    gifColumn.map((item) => {
                                        if (item === null) {
                                            return <div / > ;
                                        }
                                        return <GifListItem
                                        gif = {
                                            item.gif
                                        }
                                        index = {
                                            item.gif.details.index
                                        }
                                        key = {
                                            item.gif.details.index
                                        }
                                        showStaticPreview = {
                                            showStaticPreview
                                        }
                                        />;
                                    })
                                } < /div>);
                            }

                            const noResults = (this.props.loaded === undefined || this.props.loaded) && !this.state.emptyQuery && this.props.processedGifs.length === 0;
                            const style = {};
                            if (!noResults) {
                                style.height = `${this.props.processedGifs.length ? this.state.computedLayout.loaderHeight : 400}px`;
                            }

                            return <div
                            ref = {
                                this.setElement
                            }
                            className = {
                                `GifList ${this.props.className || ''}`
                            }
                            data - columns = {
                                this.props.staticColumns
                            }
                            style = {
                                    style
                                } >
                                {
                                    this.state.computedLayout.loaderHeight > 0 && gifColumnsElements
                                } {
                                    this.props.pending && < div className = "spinner" > < /div> } {
                                        noResults && < p className = "no-results" > {
                                            gettextSub('No Results')
                                        } < /p> } {
                                            !process.env.BROWSER && < script type = "text/javascript"
                                            nonce = {
                                                this.context.response.locals.cspNonce
                                            }
                                            dangerouslySetInnerHTML = {
                                                    {
                                                        __html: PRIVATE_CONSTANTS.INLINE_MATH_SERVICE_SRC || ''
                                                    }
                                                } > < /script>} <
                                                /div>;
                                        }
                                    }