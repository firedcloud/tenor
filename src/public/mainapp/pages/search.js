import {
    autobind
} from 'core-decorators';

import {
    Component
} from 'inferno'; // eslint-disable-line no-unused-vars

import {
    Link,
    Page
} from '../../common/components';
import {
    CONSTANTS
} from '../../common/config';
import {
    Metadata
} from '../../common/metadata';
import {
    capitalize,
    localURL,
    getArticleLDJSON,
    isMobile,
    safelySerializeJSON,
    window
} from '../../common/util';

import {
    Carousel,
    MobileCarousel
} from '../components/Carousel';
import {
    GifList
} from '../components/GifList';
import {
    gifOGMeta
} from '../components/gifOGMeta';
import {
    RelatedTag
} from '../components/Tag';
import {
    UpsellPill
} from '../components/UpsellPill';

import {
    subscribe,
    transformProps
} from '../../../replete';

import './search.scss';

import searchFreq from './search-page-alphabetical-category.json';


const searchFreqObj = JSON.parse(searchFreq);
const searchFreqObjKeys = Object.keys(searchFreqObj);
searchFreqObjKeys.sort();
const searchFreqPercentiles = {};
const bucketCounts = [0, 0, 0, 0, 0, 0];

const searchFreqTotal = searchFreqObjKeys.reduce((total, key) => {
    // We need to look up all the previous frequencies added up.
    searchFreqPercentiles[key] = total;
    return total + searchFreqObj[key];
}, 0);
const searchFreqPercentilesKeys = Object.keys(searchFreqPercentiles);
searchFreqPercentilesKeys.sort();


function getSearchTermBucket(s) {
    let highestKey = searchFreqPercentilesKeys[0];

    for (const key of searchFreqPercentilesKeys) {
        if (key > s) {
            break;
        }
        highestKey = key;
    }
    return (searchFreqPercentiles[highestKey] || 0) / searchFreqTotal;
}

Object.entries(searchFreqObj).forEach(([key, count]) => {
    const idx = selectItemIdx(bucketCounts, getSearchTermBucket(key));
    bucketCounts[idx] += count;
});
const bucketCountsTotal = bucketCounts.reduce((total, i) => {
    return total + i;
}, 0);
console.log('search title bucketCounts', bucketCounts);
console.log('ideal bucket count:', searchFreqTotal / 6);
console.log('actual total:', searchFreqTotal);
console.log('bucket total:', bucketCountsTotal);


function selectItemIdx(ary, flot) {
    // flot is 0 <= flot < 1.0
    return Math.floor(flot * ary.length);
}


function selectItem(ary, flot) {
    return ary[selectItemIdx(ary, flot)];
}


export function cleanQuery(s) {
    if (s) {
        s = s.replace(/‘/g, '\'').replace(/’/g, '\'').replace(/“/g, '"').replace(/”/g, '"');
    }
    return s;
}

const PAGE_MEDIA_TYPE = {
    STICKERS: 'stickers',
    GIFS: 'gifs',
};


@transformProps((props, context) => {
    const searchData = props.match.params.searchData;
    props.searchData = searchData ? cleanQuery(decodeURIComponent(searchData)) : undefined;
    props.searchMediaType = searchData ? context.gtService.parseURLSearchMediaType(searchData) : PAGE_MEDIA_TYPE.GIFS;
    props.searchTerms = searchData ? context.gtService.parseURLSearchTags(props.searchData) : [];
    props.searchTerm0 = props.searchTerms[0];
    props.searchTermsSpaced = props.searchTerms.join(' ');
    props.searchTermsDashed = props.searchTerms.join('-');
    props.exploreTermsDashed = props.searchData ? props.searchTermsDashed : null;

    props.contentfilter = 'low';

    return props;
})
@subscribe({
    gifs: ['api.gifs.search.*', 'searchTermsSpaced', 'contentfilter'],
    stickers: ['api.stickers.search.*', 'searchTermsSpaced', 'contentfilter'],
    exploreData: ['api.exploreterms.*', 'exploreTermsDashed'],
    searchSuggestions: ['api.searchSuggestions.*', 'searchTermsSpaced'],
    isMobile: ['ui.isMobile'],
})
export class SearchPage extends Page {
    pageChanged(nextProps) {
        return nextProps.searchData !== this.props.searchData;
    }
    propsNeedProcessing(nextProps) {
        for (const key of ['gifs', 'exploreData', 'searchSuggestions']) {
            if (nextProps[key] !== this.props[key]) {
                return true;
            }
        }
        return false;
    }
    pageInit(props) {
        const gettextSub = this.context.gtService.gettextSub;

        this.ttl = CONSTANTS.SEARCH_PAGE_TTL;

        this.context.response.surrogateKey('SearchPage', '/search/', `term:${encodeURIComponent(props.searchTermsDashed)}`);

        props.validExploreData = null;

        this.title = gettextSub('Search Tenor for GIFs');
        this.h1_title = '';
        this.description = '';
        this.keywords = '';
    }
    processNewProps(props) {
        if (!props.searchData) {
            const q = new URLSearchParams(props.location.search).get('q');
            // An empty value will be interpreted by Angular as boolean true,
            // so check for string.
            if (q && typeof q === 'string') {
                // Handles /search/?q=foo
                this.redirect(this.linkToSearch(q), true);
            }
        } else {
            this.done(props);
            this.handleExploretermBody(props);
            this.setMetadata(props);
            this.noindex = this.context.response.status == 200 && !props.exploreData.results.length;
        }
    }
    registerAdViewSession(gif) {
        this.context.apiService.registerAdViewSession(gif);
        if (gif.metrics && gif.metrics.pixels) {
            gif.metrics.pixels.forEach((url) => {
                return this.context.apiService.registerPixel(url);
            });
        }
    }

    @autobind
    trackSeeAllContentTap(mediaType) {
        return () => {
            this.context.apiService.trackSeeAllContentTap(mediaType, 'search');
        };
    }

    @autobind
    handlePageDone() {
        super.handlePageDone();
        if (process.env.BROWSER && window.ga) {
            if (this.props.searchTerms.length) {
                window.ga('send', 'event', {
                    eventCategory: 'SearchPage',
                    eventAction: 'initial-results-fetched',
                    eventLabel: this.props.searchTerms.join('-'),
                    eventValue: this.props.gifs.results.length,
                });
            }

            window.fbq('track', 'ViewContent', {
                content_name: this.title
            });
        }
    }
    @autobind
    getMoreSearchResults() {
        this.context.store.call('api.gifs.search', [this.props.searchTermsSpaced, this.props.contentfilter], 'more');
    }
    @autobind
    getMoreStickers() {
        this.context.store.call('api.stickers.search', [this.props.searchTermsSpaced, this.props.contentfilter], 'more');
    }
    @autobind
    done(props) {
        const body = props.gifs;
        const results = body.generic_stream ? [] : body.results;
        this.setCanonicalURL(this.linkToSearch(props.searchTerms, props.searchMediaType));

        if (!results.length) {
            this.context.response.keepPage = true;
            this.context.response.status = 404;
        }

        if (process.env.BROWSER) {
            const ads = results.filter((gif) => {
                return (gif.feature_info ? true : false);
            });
            ads.forEach((gif) => {
                return this.registerAdViewSession(gif);
            });
        }
    }

    @autobind
    handleExploretermBody(props) {
        const body = props.exploreData;
        if (body.results && body.results.length && localURL(body.results[0].url).substr(0, 8) === '/search/') {
            props.validExploreData = body.results[0];
        }
    }

    @autobind
    mergeTermLists() {
        const exploreData = this.props.validExploreData;
        const tags = {};
        if (exploreData && exploreData.keyword_searches.length) {
            exploreData.keyword_searches.forEach((tag, i) => {
                tags[tag.searchterm] = {
                    name: tag.name
                };
            });
        } else if (this.props.searchSuggestions.results && this.props.searchSuggestions.results.length > 0) {
            this.props.searchSuggestions.results.forEach((tag) => {
                tags[tag] = {
                    name: tag
                };
            });
        }

        if (exploreData && exploreData.searches.length > 0) {
            exploreData.searches.forEach((tag) => {
                tags[tag.searchterm] = {
                    name: tag.name
                };
            });
        }

        if (exploreData && exploreData.nestedsearches.length) {
            exploreData.nestedsearches.forEach((search) => {
                search.searches.forEach((tag) => {
                    tags[tag.searchterm] = {
                        name: tag.name
                    };
                });
            });
        }
        if (tags[this.props.searchTermsSpaced]) {
            delete tags[this.props.searchTermsSpaced];
        }
        return tags;
    }
    setMetadata(props) {
        const gettextSub = this.context.gtService.gettextSub;

        const terms = [];
        for (let i = 0; i < props.searchTerms.length; i++) {
            terms.push(capitalize(props.searchTerms[i]));
        }

        const searchTermBucket = getSearchTermBucket(props.searchTermsSpaced);
        console.log('searchTermBucket', searchTermBucket);

        let titleFragment = terms.join(' ');
        if (this.validExploreData) {
            titleFragment = this.validExploreData.name;
        }
        if (titleFragment) {
            const titleFragmentObj = {
                titleFragment
            };

            this.h1_title = gettextSub(`${titleFragment}`);

            selectItem([
                () => {
                    this.searchPageMultivariateGroup = 'Control';
                    this.title = gettextSub('{titleFragment} GIFs | Tenor', titleFragmentObj);
                    this.description = gettextSub('With Tenor, maker of GIF Keyboard, add popular {titleFragment} animated GIFs to your conversations. Share the best GIFs now >>>', titleFragmentObj);
                },
                () => {
                    this.searchPageMultivariateGroup = 'Test 1';
                    this.title = gettextSub('{titleFragment} GIFs | Tenor', titleFragmentObj);
                    this.description = gettextSub('With Tenor, maker of GIF Keyboard, add popular {titleFragment} animated GIFs to your conversations. Share the best GIFs now >>>', titleFragmentObj);
                },
                () => {
                    this.searchPageMultivariateGroup = 'Test 2';
                    this.title = gettextSub('{titleFragment} GIFs | Tenor', titleFragmentObj);
                    this.description = gettextSub('With Tenor, maker of GIF Keyboard, add popular {titleFragment} animated GIFs to your conversations. Share the best GIFs now >>>', titleFragmentObj);
                },
                () => {
                    this.searchPageMultivariateGroup = 'Test 3';
                    this.title = gettextSub('{titleFragment} GIFs | Tenor', titleFragmentObj);
                    this.description = gettextSub('With Tenor, maker of GIF Keyboard, add popular {titleFragment} animated GIFs to your conversations. Share the best GIFs now >>>', titleFragmentObj);
                },
                () => {
                    this.searchPageMultivariateGroup = 'Test 4';
                    this.title = gettextSub('{titleFragment} GIFs | Tenor', titleFragmentObj);
                    this.description = gettextSub('With Tenor, maker of GIF Keyboard, add popular {titleFragment} animated GIFs to your conversations. Share the best GIFs now >>>', titleFragmentObj);
                },
                () => {
                    this.searchPageMultivariateGroup = 'Test 5';
                    this.title = gettextSub('{titleFragment} GIFs | Tenor', titleFragmentObj);
                    this.description = gettextSub('With Tenor, maker of GIF Keyboard, add popular {titleFragment} animated GIFs to your conversations. Share the best GIFs now >>>', titleFragmentObj);
                },
            ], searchTermBucket)();
        }
        this.keywords = `${this.props.searchTerms.join(',')},gifs,search,memes`;
    }

    renderPage() {
            const gettextSub = this.context.gtService.gettextSub;

            const spaceSeparatedSearchTerms = this.props.searchTerms.join('%20');

            const relatedTags = this.mergeTermLists();

            let articleLDJSON = {};
            if (this.props.gifs.results.length) {
                articleLDJSON = getArticleLDJSON(this, this.props.gifs.results[0]);
            }

            const stickerSearchPage = this.props.searchMediaType === PAGE_MEDIA_TYPE.STICKERS;

            return <div className = "SearchPage container page" >
                <
                Metadata page = {
                    this
                } >
                <
                meta name = "twitter:app:url:googleplay"
            content = {
                `riffsy://search/${spaceSeparatedSearchTerms}`
            }
            />

            <
            meta property = "al:android:url"
            content = {
                `riffsy://search/${spaceSeparatedSearchTerms}`
            }
            />

            <
            link rel = "alternate"
            href = {
                `android-app://com.riffsy.FBMGIFApp/riffsy/search/${spaceSeparatedSearchTerms}`
            }
            />

            {
                gifOGMeta(this.props.gifs.results)
            }

            <
            script type = "application/ld+json"
            dangerouslySetInnerHTML = {
                {
                    __html: safelySerializeJSON(articleLDJSON)
                }
            }
            /> <
            /Metadata>

            <
            div className = 'gallery-container'
            itemscope = {
                true
            }
            itemtype = "http://schema.org/ImageGallery" >
                <
                meta itemprop = "url"
            content = {
                this.canonicalURL
            }
            /> <
            meta itemprop = "mainEntityOfPage"
            content = {
                this.canonicalURL
            }
            /> <
            meta itemprop = "keywords"
            content = {
                this.keywords
            }
            /> <
            meta itemprop = "headline"
            content = {
                this.title
            }
            /> <
            meta itemprop = "name"
            content = {
                this.title
            }
            /> {
                this.h1_title.length && < h1 > {
                    this.h1_title
                } < /h1> } {
                    this.props.searchData && < div className = "search" > {
                        Object.keys(relatedTags).length > 0 &&
                        <
                        ul className = {
                            `list-unstyled TagList ${isMobile() ? '' : 'no-wrap'}`
                        }
                        style = {
                            {
                                width: 'auto'
                            }
                        } > {
                            Object.entries(relatedTags).map(([termKey, term]) => {
                                return <li key = {
                                    termKey
                                } > < RelatedTag searchterm = {
                                    termKey
                                }
                                name = {
                                    term.name
                                }
                                onClick = {
                                    term.onClick || null
                                }
                                /></li > ;
                            })
                        } <
                        /ul>
                    }

                    {
                        this.props.stickers.results.length > 0 && !stickerSearchPage &&
                            <
                            div >
                            <
                            div className = 'section-header-row' >
                            <
                            h2 > Stickers < /h2> <
                            Link
                        className = "switch-view-link"
                        to = {
                            `/search/${this.props.searchTerms.join('-')}-stickers`
                        }
                        external = {
                            false
                        }
                        onClick = {
                                this.trackSeeAllContentTap('stickers')
                            } >
                            {
                                gettextSub('See all Stickers')
                            } < /Link> <
                            /div> {
                                this.props.isMobile ?
                                    <
                                    MobileCarousel
                                items = {
                                    this.props.stickers.results
                                }
                                itemsExhaustedCallback = {
                                    this.getMoreStickers
                                }
                                height = {
                                    100
                                }
                                margin = {
                                    5
                                }
                                /> : <
                                Carousel
                                items = {
                                    this.props.stickers.results
                                }
                                type = {
                                    'stickers'
                                }
                                itemsExhaustedCallback = {
                                    this.getMoreStickers
                                }
                                />
                            } <
                            /div>
                    }

                    <
                    div className = 'section-header-row' >
                        <
                        h2 > {
                            stickerSearchPage ? 'Stickers' : 'GIFs'
                        } < /h2>

                    {
                        stickerSearchPage &&
                            <
                            Link
                        className = "switch-view-link"
                        to = {
                            `/search/${this.props.searchTerms.join('-')}-gifs`
                        }
                        external = {
                            false
                        }
                        onClick = {
                                this.trackSeeAllContentTap('gifs')
                            } >
                            {
                                gettextSub('See all GIFs')
                            } < /Link>
                    } <
                    /div>

                    <
                    GifList
                    query = {
                        this.props.searchData
                    }
                    gifs = {
                        stickerSearchPage ? this.props.stickers.results : this.props.gifs.results
                    }
                    loaded = {
                        stickerSearchPage ? this.props.stickers.loaded : this.props.gifs.loaded
                    }
                    pending = {
                        stickerSearchPage ? this.props.stickers.pending : this.props.gifs.pending
                    }
                    itemsExhaustedCallback = {
                        stickerSearchPage ? this.getMoreStickers : this.getMoreSearchResults
                    }
                    // NOTE: disabling GifMaker entry points for sticker searches
                    addGifMakerEntrypoint = {
                        stickerSearchPage ? false : this.context.arianeMultivariateGroupSelect({
                            // Entrypoint approved for 50% rollout:
                            // https://ariane.googleplex.com/launch/298054
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
                        })
                    }
                    /> <
                    /div>} <
                    /div>

                    <
                    UpsellPill
                    text = {
                        gettextSub('Search from GIF Keyboard')
                    }
                    to = "https://apps.apple.com/app/apple-store/id917932200?pt=39040802&ct=searchpagev2&mt=8"
                    origin = 'search' /
                        >
                        <
                        /div>;
                }
            }