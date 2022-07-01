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
    isSticker,
    isTouchDevice
} from '../../common/util';
import {
    TrendsTag
} from './Tag';
import {
    Gif,
    MEDIA_QUALITY
} from './Gif';
import {
    GifFavButton
} from '../components/GifFavButton';
import {
    GifListItem
} from '../components/GifList';
import {
    ProgressCircleIndeterminate
} from '../../common/components/ProgressCircle';
import {
    subscribe
} from '../../../replete';

import './Carousel.scss';

export class StickerCarouselItem extends GifListItem {
    @autobind
    setElement(element) {
        this.element = element;
        const {
            height
        } = this.props;
        if (element) {
            this.height = height || element.offsetWidth;
            this.width = this.height;
            this.triggerUpdate();
        }
    }

    @autobind
    onClick() {
        this.props.trackingCallback({
            idx: this.props.idx,
            gif: this.props.gif
        });
    }

    render() {
            const gettextSub = this.context.gtService.gettextSub;
            const {
                gif,
                margin,
                height
            } = this.props;
            const isClickDisabled = this.props.disableOnClick || !gif.itemurl;
            this.isSticker = isSticker(gif);
            const itemStyle = {};
            if (margin) {
                itemStyle.margin = `0 ${margin}px`;
            }
            if (height) {
                itemStyle.height = `${height}px`;
                itemStyle.width = `${height}px`;
            }

            return ( <
                figure className = "GifListItem"
                ref = {
                    this.setElement
                }
                style = {
                    itemStyle
                } >
                <
                Link to = {
                    isClickDisabled ? undefined : this.linkToView(gif)
                }
                onClick = {
                    isClickDisabled ? undefined : this.onClick
                } >
                <
                Gif gif = {
                    gif
                }
                quality = {
                    MEDIA_QUALITY.TINY
                } // TODO show static previews for slow connections? (see eg. GifList)
                width = {
                    this.width
                }
                height = {
                    this.height
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
                            !this.isSticker &&
                                <
                                div className = "actions" >
                                <
                                GifFavButton gif = {
                                    gif
                                }
                            /> <
                            /div>
                        } <
                        figcaption className = "tags" > < ul className = "list-unstyled" > {
                            this.makeTagAnchors(gif.tags)
                        } < /ul></figcaption > {
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

            class BaseCarousel extends CustomComponent {
                constructor(props, context) {
                    super(props, context);
                }

                componentDidMount() {
                    window.addEventListener('resize', this.updateCarouselDimensions);
                }

                componentWillUnmount() {
                    window.removeEventListener('resize', this.updateCarouselDimensions);
                }

                componentDidUpdate(prevProps) {
                    if (prevProps.items.length !== this.props.items.length) {
                        this.setState({
                            fetchingMoreItems: false
                        });
                        setTimeout(this.updateCarouselDimensions, 10); // NOTE: allows setState to complete before updating dimensions
                    }
                }

                @autobind
                setCarouselEl(element) {
                    this.carouselEl = element;
                    this.updateCarouselDimensions();
                    this.triggerUpdate();
                }

                @autobind
                setFramesContainerEl(element) {
                    this.framesContainerEl = element;
                }

                fetchMoreItems() {
                    if (this.state.fetchingMoreItems || !this.props.itemsExhaustedCallback) {
                        return;
                    }
                    this.props.itemsExhaustedCallback();
                    this.setState({
                        fetchingMoreItems: true
                    });
                }

                @autobind
                trackItemSelect({
                    idx,
                    gif
                }) {
                    const eventName = 'stickers_carousel_result_tap';
                    const params = {
                        viewindex: idx,
                        rid: gif.id,
                        category: this.getPageType(),
                    };
                    if (params.category === 'search') {
                        const searchTerms = this.parseURLSearchTags(this.context.router.history.location.pathname).join(' ');
                        params.tag = searchTerms;
                    } else if (params.category === 'profile' && gif.user && gif.user.username) {
                        params.tag = `@${gif.user.username}`;
                    }

                    this.trackEvent(eventName, params);
                }

                @autobind
                trackCarouselMove(type, direction, page) {
                    let eventName;
                    if (direction === 'next') {
                        eventName = 'stickers_carousel_advance';
                    } else if (direction === 'prev') {
                        eventName = 'stickers_carousel_retreat';
                    }

                    const params = {};
                    if (type === 'swipe') {
                        const carouselPosition = this.state.scrollPos + this.state.swipeDistance + this.carouselEl.offsetWidth;
                        const stickerWidth = (this.ITEM_HEIGHT + this.ITEM_MARGIN * 2);
                        params.viewindex = Math.floor(carouselPosition / stickerWidth) - 1;
                    } else if (type === 'button') {
                        params.viewindex = (page + 1) * this.itemsPerPage - 1;
                    }

                    params.category = this.getPageType();

                    this.trackEvent(eventName, params);
                }

                getPageType() {
                    const path = this.context.gtService.delocalizeUrlPath(this.context.router.history.location.pathname);
                    if (path.match(/\/search\//)) {
                        return 'search';
                    } else if (path.match(/\/users\//) || path.match(/\/official\//)) {
                        return 'profile';
                    }
                    return;
                }

                trackEvent(eventName, params) {
                    this.context.apiService.registerEvent(eventName, params);
                }
            }


            export class MobileCarousel extends BaseCarousel {
                constructor(props, context) {
                    super(props, context);
                    this.state = {
                        scrollPos: 0,
                        swipeDistance: 0,
                        clientX: 0,
                    };
                    this.ITEM_HEIGHT = props.height;
                    this.ITEM_MARGIN = props.margin;
                    this.carouselBottomPadding = 20;
                    this.momentumTimeout = 1000;
                    this.momentumMaxSpeed = 2;
                    this.isTouchDevice = isTouchDevice();
                }

                componentDidMount() {
                    super.componentDidMount();
                    if (process.env.BROWSER) {
                        const options = {
                            threshold: 10,
                            velocity: .5,
                        };

                        // NOTE: need to dynamically import hammerjs since it requires
                        // the window object (will throw an Error if imported server-side)
                        import ('hammerjs').then((hammer) => {
                            const Hammer = hammer.default;
                            const hammertime = new Hammer(this.framesContainerEl);
                            options.direction = Hammer.DIRECTION_HORIZONTAL;
                            hammertime.get('swipe').set(options);
                            hammertime.on('swipe', this.startMomentumScroll);
                        });
                    }
                }

                @autobind
                handleTouchStart(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.preventWindowScrolling(true);
                    this.isMomentumScrolling && this.stopMomentumScroll();
                    this.touchInitiated = true;
                    this.hasMoved = false;
                    if (e.type.slice(0, 5) === 'mouse') {
                        this.clientX = e.clientX;
                        this.clientY = e.clientY;
                    } else if (e.type.slice(0, 5) === 'touch') {
                        this.clientX = e.touches[0].clientX;
                        this.clientY = e.touches[0].clientY;
                    }
                }

                @autobind
                handleTouchEnd(e) {
                    if (e.type.slice(0, 5) === 'mouse') {
                        // NOTE: prevents click event after carousel scroll + mouse up
                        if (this.hasMoved) {
                            this.state.disableItemClick = true;
                            this.triggerUpdate();
                            setTimeout(() => this.setState({
                                disableItemClick: false
                            }), 10);
                        }
                    }
                    this.scrollDirection = undefined;
                    this.stopMovementTracking();
                }

                @autobind
                stopMovementTracking() {
                    this.preventWindowScrolling(false);

                    !this.isMomentumScrolling && this.setFinalScrollPositionState();
                }

                setFinalScrollPositionState() {
                    const {
                        scrollPos,
                        swipeDistance
                    } = this.state;
                    swipeDistance > 0 && this.trackCarouselMove('swipe', 'next');
                    swipeDistance < 0 && this.trackCarouselMove('swipe', 'prev');

                    const newScrollPos = scrollPos + swipeDistance;
                    this.setState({
                        scrollPos: newScrollPos >= 0 ? newScrollPos : 0,
                        swipeDistance: 0,
                    });
                }

                preventWindowScrolling(bool) {
                    if (bool) {
                        window.document.documentElement.classList.add('no-scroll-maintain-y-offset');
                        window.document.body.classList.add('no-scroll-maintain-y-offset');
                    } else {
                        window.document.documentElement.classList.remove('no-scroll-maintain-y-offset');
                        window.document.body.classList.remove('no-scroll-maintain-y-offset');
                    }
                }

                @autobind
                startMomentumScroll(e) {
                    // NOTE: hammerjs swipe events on Android sometimes incorrectly register
                    // velocity as zero. We should use overallVelocity as a fallback.
                    const velocityX = e.velocityX !== 0 ? e.velocityX : e.overallVelocityX;
                    this.direction = velocityX > 0 ? 'right' : 'left';
                    const speed = Math.abs(velocityX);
                    if (speed === 0) {
                        this.stopMomentumScroll();
                    } else {
                        this.momentumSpeed = Math.min(speed, this.momentumMaxSpeed);
                        this.isMomentumScrolling = true;
                        window.requestAnimationFrame(this.momentumScrollStep);
                    }
                }

                @autobind
                stopMomentumScroll(e) {
                    this.isMomentumScrolling = false;
                    this.momentumScrollStartTime = null;
                    this.setFinalScrollPositionState();
                }

                @autobind
                momentumScrollStep(timestamp) {
                    if (!this.momentumScrollStartTime) {
                        this.momentumScrollStartTime = timestamp;
                        this.prevStepTime = timestamp;
                    }
                    const elapsed = timestamp - this.prevStepTime;
                    const totalElapsed = timestamp - this.momentumScrollStartTime;
                    this.prevStepTime = timestamp;

                    const timingFn = Math.pow((this.momentumTimeout - totalElapsed) / this.momentumTimeout, 2); // approximates ease-out
                    const offset = Math.ceil(this.momentumSpeed * elapsed * timingFn) * (this.direction === 'left' ? 1 : -1);

                    const newSwipeDistance = Math.round(this.state.swipeDistance + offset);
                    const newPos = this.state.scrollPos + newSwipeDistance;

                    const isOutOfBounds = newPos <= 0 || newPos >= this.scrollMax;
                    if (isOutOfBounds || totalElapsed > this.momentumTimeout || !this.isMomentumScrolling) {
                        this.stopMomentumScroll();
                        newPos >= this.scrollMax && this.fetchMoreItems();
                    } else {
                        this.setState({
                            swipeDistance: newSwipeDistance
                        });
                        window.requestAnimationFrame(this.momentumScrollStep);
                    }
                }

                @autobind
                move(e) {
                    let clientX;
                    let clientY;
                    if (e.type.slice(0, 5) === 'mouse') {
                        clientX = e.clientX;
                        clientY = e.clientY;
                    } else if (e.type.slice(0, 5) === 'touch') {
                        clientX = e.touches[0].clientX;
                        clientY = e.touches[0].clientY;
                    }

                    const moveX = this.clientX - clientX;
                    if (this.touchInitiated) {
                        this.touchInitiated = false;
                        this.hasMoved = true;
                        const moveY = this.clientY - clientY;
                        this.scrollDirection = Math.abs(moveY) > Math.abs(moveX) ? 'vertical' : 'horizontal';
                    }

                    if (this.scrollDirection === 'horizontal') {
                        const currentScrollPos = moveX + this.state.scrollPos;
                        if (currentScrollPos > this.scrollMax) {
                            this.fetchMoreItems();
                        } else if (currentScrollPos >= 0) {
                            this.setState({
                                swipeDistance: moveX
                            });
                        }
                    } else if (this.scrollDirection === 'vertical') {
                        this.stopMovementTracking();
                    }
                }

                @autobind
                updateCarouselDimensions() {
                    if (this.framesContainerEl && this.carouselEl) {
                        const carouselWidth = this.carouselEl.offsetWidth;
                        const framesContainerWidth = this.framesContainerEl.offsetWidth;
                        this.scrollMax = framesContainerWidth - carouselWidth + (this.ITEM_HEIGHT + this.ITEM_MARGIN * 2);
                    } else {
                        this.scrollMax = 0;
                    }
                }

                render() {
                    const {
                        items
                    } = this.props;
                    const {
                        scrollPos,
                        swipeDistance
                    } = this.state;
                    let carouselShift = scrollPos + swipeDistance;
                    carouselShift = carouselShift < 0 ? 0 : carouselShift;
                    carouselShift = carouselShift > this.scrollMax ? this.scrollMax : carouselShift;

                    let itemList = [];
                    itemList = items.map((item, index) => {
                        return ( <
                            StickerCarouselItem gif = {
                                item
                            }
                            idx = {
                                index
                            }
                            key = {
                                index
                            }
                            height = {
                                this.ITEM_HEIGHT
                            }
                            margin = {
                                this.ITEM_MARGIN
                            }
                            trackingCallback = {
                                this.trackItemSelect
                            }
                            disableOnClick = {
                                this.state.disableItemClick
                            }
                            />
                        );
                    });
                    if (this.state.fetchingMoreItems) {
                        itemList.push( <
                            div className = 'loader'
                            style = {
                                {
                                    height: `${this.ITEM_HEIGHT}px`,
                                    width: `${this.ITEM_HEIGHT}px`
                                }
                            } >
                            <
                            ProgressCircleIndeterminate diameter = {
                                34
                            }
                            strokeWidthRatio = {
                                .1
                            }
                            color = {
                                '#007add'
                            }
                            animationDuration = {
                                2000
                            }
                            /> <
                            /div>
                        );
                    }

                    return ( <
                        div className = "MobileCarousel"
                        onTouchStart = {
                            this.handleTouchStart
                        }
                        onTouchEnd = {
                            this.handleTouchEnd
                        }
                        onTouchMove = {
                            this.move
                        }
                        onMouseDown = {
                            this.isTouchDevice ? undefined : this.handleTouchStart
                        }
                        onMouseUp = {
                            this.isTouchDevice ? undefined : this.handleTouchEnd
                        }
                        onMouseMove = {
                            this.isTouchDevice ? undefined : this.move
                        } >
                        <
                        div className = {
                            `carousel-container StickerList`
                        }
                        ref = {
                            this.setCarouselEl
                        }
                        style = {
                            {
                                height: `${this.ITEM_HEIGHT + this.carouselBottomPadding}px`
                            }
                        } >
                        <
                        div className = "frames-container"
                        ref = {
                            this.setFramesContainerEl
                        }
                        style = {
                            {
                                transform: `translate(${-carouselShift}px)`
                            }
                        } >
                        {
                            itemList
                        } <
                        /div> <
                        /div> <
                        /div>
                    );
                }
            }

            /*
                NOTE: AutoScrollCarousel requires that all images are the same size to render properly
            */
            export class AutoScrollCarousel extends CustomComponent {
                constructor(props, context) {
                    super(props, context);
                    this.state = {
                        idx: 1,
                    };
                    this.frames = this.setFrames(props);
                    this.imgMargin = props.imgMargin || 16;
                    if (props.interval < props.speed + 100) {
                        throw new Error('interval time between images shown must be at least 100ms greater than scroll speed');
                    }
                }

                setFrames({
                    randomStart,
                    assets
                }) {
                    const idx = randomStart ? Math.floor(Math.random() * assets.length) : assets.length - 1;
                    let frames = assets.slice(idx, assets.length).concat(assets.slice(0, idx));
                    frames = frames.concat(frames.slice(0, 3));
                    return frames;
                }

                componentDidMount() {
                    window.addEventListener('resize', this.resetDimensions);
                    const {
                        interval,
                        speed
                    } = this.props;

                    setTimeout(() => {
                        this.next();
                        this.nextInterval = setInterval(this.next, interval);
                    }, (interval - speed));
                }

                componentWillUnmount() {
                    window.removeEventListener('resize', this.resetDimensions);
                    clearInterval(this.nextInterval);
                }

                @autobind
                resetDimensions() {
                    const {
                        imageAspectRatio,
                        imgHeightMin,
                        imgHeightMax
                    } = this.props;
                    this.carouselWidth = this.carouselEl.clientWidth;
                    this.carouselHeight = this.containerEl.clientHeight;
                    this.largeImgWidth = this.carouselHeight * imageAspectRatio * imgHeightMax;
                    this.imgWidth = this.carouselHeight * imageAspectRatio * imgHeightMin;
                    this.setState({
                        left: this.calcLeftOffset(this.state.idx),
                    });
                }

                calcLeftOffset(idx) {
                    const initialOffset = this.imgWidth - (((this.carouselWidth - this.largeImgWidth) / 2) - this.imgMargin);
                    const offsetPerImage = this.imgWidth + this.imgMargin;
                    return -(initialOffset + (idx - 1) * offsetPerImage);
                }

                @autobind
                next() {
                    let {
                        left,
                        idx
                    } = this.state;
                    idx = idx + 1;
                    left = this.calcLeftOffset(idx);

                    this.setState({
                        reset: false,
                        left,
                        idx,
                    });

                    if (idx === this.frames.length - 2) {
                        idx = 1;
                        setTimeout(() => this.setState({
                            reset: true,
                            left: this.calcLeftOffset(idx),
                            idx,
                        }), this.props.speed + 50);
                    }
                }

                @autobind
                setCarousel(e) {
                    this.carouselEl = e;
                    e && this.resetDimensions();
                }

                @autobind
                setContainer(e) {
                    this.containerEl = e;
                }

                render() {
                    const {
                        speed,
                        imgHeightMin,
                        imgHeightMax
                    } = this.props;
                    const shiftTransition = this.state.reset ? '' : `left ${speed / 1000}s ease-out`;
                    const heightTransition = this.state.reset ? '' : `height ${speed / 1000}s ease-out`;

                    return ( <
                        div className = "AutoScrollCarousel"
                        ref = {
                            this.setCarousel
                        } >
                        <
                        div className = "carousel-img-container"
                        style = {
                            {
                                left: `${this.state.left}px`,
                                transition: shiftTransition,
                            }
                        }
                        ref = {
                            this.setContainer
                        } >
                        {
                            this.frames.map((src, idx) => {
                                    return ( <
                                        img className = {
                                            `carousel-img-item ${this.state.idx === idx ? 'centered' : ''}`
                                        }
                                        src = {
                                            src
                                        }
                                        style = {
                                            {
                                                transition: heightTransition,
                                                height: this.state.idx === idx ? `${imgHeightMax * 100}%` : `${imgHeightMin * 100}%`,
                                                marginRight: `${this.imgMargin}px`,
                                            }
                                        }
                                        />);
                                    })
                            } <
                            /div> <
                            /div>
                        );
                    }
                }

                @subscribe({
                    isMobile: ['ui.isMobile'],
                })
                export class Carousel extends BaseCarousel {
                    constructor(props, context) {
                        super(props, context);
                        this.state.scrollPos = 0;
                        this.state.page = 0;
                        this.ITEM_MARGIN = 10;
                        this.updateCarouselDimensions();
                    }

                    @autobind
                    onNext() {
                        if (this.state.page >= this.state.maxPage) {
                            return;
                        }
                        const carouselWidth = this.carouselEl.offsetWidth;
                        const page = this.state.page + 1;
                        this.trackCarouselMove('button', 'next', page);
                        page === this.state.maxPage && this.fetchMoreItems();

                        this.setState({
                            page,
                            scrollPos: page * (carouselWidth),
                        });
                    }

                    @autobind
                    onPrev() {
                        if (this.state.page <= 0) {
                            return;
                        }
                        const carouselWidth = this.carouselEl.offsetWidth;
                        const page = this.state.page - 1;
                        this.trackCarouselMove('button', 'prev', page);
                        this.setState({
                            page,
                            scrollPos: page * carouselWidth,
                        });
                    }

                    @autobind
                    updateCarouselDimensions() {
                        const {
                            type,
                            items
                        } = this.props;
                        const numItems = items.length;
                        this.itemsPerPage = 5;

                        if (this.carouselEl) {
                            const carouselWidth = this.carouselEl.offsetWidth;

                            if (type === 'tags' && carouselWidth <= 930) {
                                this.itemsPerPage = 4;
                            }

                            if (type === 'stickers') {
                                if (carouselWidth <= 812) {
                                    this.itemsPerPage = 4;
                                }
                                if (carouselWidth <= 600) {
                                    this.itemsPerPage = 3;
                                }
                            }
                        }
                        const maxPage = Math.ceil(numItems / this.itemsPerPage) - 1;

                        if (this.state.maxPage !== maxPage) {
                            this.setState({
                                maxPage
                            });
                        }
                    }

                    render() {
                            const {
                                items,
                                type,
                                isMobile
                            } = this.props;
                            const {
                                scrollPos,
                                page,
                                maxPage
                            } = this.state;

                            if (type === 'stickers') {
                                const itemList = items.map((item, index) => {
                                    return ( <
                                        StickerCarouselItem gif = {
                                            item
                                        }
                                        idx = {
                                            index
                                        }
                                        key = {
                                            index
                                        }
                                        margin = {
                                            this.ITEM_MARGIN
                                        }
                                        trackingCallback = {
                                            this.trackItemSelect
                                        }
                                        />
                                    );
                                });

                                return ( <
                                    div className = "Carousel stickers" >
                                    <
                                    div className = {
                                        `carousel-container StickerList`
                                    }
                                    ref = {
                                        this.setCarouselEl
                                    } >
                                    <
                                    div className = "frames-container"
                                    ref = {
                                        this.setFramesContainerEl
                                    }
                                    style = {
                                        {
                                            left: `-${scrollPos}px`
                                        }
                                    } >
                                    {
                                        itemList
                                    } <
                                    /div> <
                                    /div> <
                                    div className = {
                                        `buttons ${maxPage ? '' : 'hidden'}`
                                    } >
                                    <
                                    div className = {
                                        `prev-button scroll-button ${page > 0 ? '' : 'disabled'}`
                                    }
                                    onClick = {
                                        this.onPrev
                                    } >
                                    <
                                    i className = "iconfont-chevron-left-icon" / >
                                    <
                                    /div> <
                                    div className = {
                                        `next-button scroll-button ${page < maxPage ? '' : 'disabled'}`
                                    }
                                    onClick = {
                                        this.onNext
                                    } >
                                    <
                                    i className = "iconfont-chevron-right-icon" / >
                                    <
                                    /div> <
                                    /div> <
                                    /div>
                                );
                            } else if (type === 'tags') {
                                const itemList = items.map((item) => {
                                    return <TrendsTag tag = {
                                        item
                                    }
                                    key = {
                                        item.searchterm
                                    }
                                    />;
                                });

                                if (isMobile) {
                                    return ( <
                                        div className = "Carousel TagList" > {
                                            itemList
                                        } <
                                        /div>
                                    );
                                }
                                return ( <
                                    div className = "Carousel tags" >
                                    <
                                    div className = {
                                        `carousel-container TagList`
                                    }
                                    ref = {
                                        this.setCarouselEl
                                    } >
                                    <
                                    div className = "frames-container"
                                    ref = {
                                        this.setFramesContainerEl
                                    }
                                    style = {
                                        {
                                            left: `-${scrollPos}px`
                                        }
                                    } >
                                    {
                                        itemList
                                    } <
                                    /div> <
                                    /div> {
                                        page > 0 && < div className = {
                                            `prev-button scroll-button`
                                        }
                                        onClick = {
                                                this.onPrev
                                            } >
                                            <
                                            i className = "iconfont-chevron-left-icon" / >
                                            <
                                            /div>} {
                                                page < maxPage && < div className = "next-button scroll-button"
                                                onClick = {
                                                        this.onNext
                                                    } >
                                                    <
                                                    i className = "iconfont-chevron-right-icon" / >
                                                    <
                                                    /div>} <
                                                    /div>
                                            );
                                    }
                                }
                            }