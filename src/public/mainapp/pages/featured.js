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
    fullURL,
    getArticleLDJSON,
    iOS,
    window,
    safelySerializeJSON
} from '../../common/util';

import {
    GifList
} from '../components/GifList';
import {
    Carousel
} from '../components/Carousel';

import {
    subscribe
} from '../../../replete';


import './featured.scss';


function searchLDJSON() {
    return {
        '@context': 'http://schema.org',
        '@type': 'WebSite',
        'url': fullURL('/'),
        'potentialAction': [{
                '@type': 'SearchAction',
                'target': fullURL('/search/{search_term_string}-gifs'),
                'query-input': 'required name=search_term_string',
            },
            {
                '@type': 'SearchAction',
                'target': 'android-app://com.riffsy.FBMGIFApp/riffsy/search/{search_term_string}',
                'query-input': 'required name=search_term_string',
            },
        ],
    };
}


@subscribe({
    trendingTags: ['api.tags.trending'],
    featuredGifs: ['api.gifs.featured'],
})
export class FeaturedPage extends Page {
    pageInit(props) {
        const gettextSub = this.context.gtService.gettextSub;
        const localizeUrlPath = this.context.gtService.localizeUrlPath;

        this.ttl = CONSTANTS.FEATURED_PAGE_TTL;

        this.setCanonicalURL(localizeUrlPath('/'));

        this.title = gettextSub('Tenor GIF Keyboard - Bring Personality To Your Conversations');
        this.description = gettextSub('Say more with Tenor. Find the perfect Animated GIFs and videos to convey exactly what you mean in every conversation.');
        this.keywords = `gifs,search gifs,share gifs,memes`;

        window.fbq('track', 'ViewContent', {
            content_name: this.title
        });
    }

    @autobind
    getMoreFeaturedResults() {
        this.context.store.call('api.gifs.featured', 'more');
    }

    renderPage() {
        const gettextSub = this.context.gtService.gettextSub;

        const trendingTags = this.props.trendingTags.tags || [];

        let articleLDJSON = {};
        if (this.props.featuredGifs.results && this.props.featuredGifs.results.length) {
            articleLDJSON = getArticleLDJSON(this, this.props.featuredGifs.results[0]);
        }
        return ( <
            div className = "FeaturedPage" >
            <
            Metadata page = {
                this
            }
            hideIOSUpsell = {
                true
            } >
            <
            script type = "application/ld+json"
            dangerouslySetInnerHTML = {
                {
                    __html: safelySerializeJSON(searchLDJSON())
                }
            }
            /> <
            script type = "application/ld+json"
            dangerouslySetInnerHTML = {
                {
                    __html: safelySerializeJSON(articleLDJSON)
                }
            }
            /> <
            /Metadata> {
                (() => {
                    // NOTE: consider changing class names with "carousel" as there is now a <Carousel/> component
                    if (iOS()) {
                        return <div className = "center-container carousel-container" >
                            <
                            div className = "carousel" >
                            <
                            div className = {
                                'slide slide-1'
                            } >
                            <
                            div className = "info" >
                            <
                            img src = "/assets/img/gif-keyboard-logo.svg"
                        alt = {
                            gettextSub('GIF Keyboard logo')
                        }
                        className = "keyboard-text"
                        width = "369" / >
                            <
                            p > {
                                gettextSub('Say more with Tenor. Find the perfect animated GIFs and videos to convey exactly what you mean in every conversation.')
                            } < /p> <
                            /div> <
                            div className = "badges" >
                            <
                            Link className = "store-badge"
                        to = "https://apps.apple.com/app/apple-store/id917932200?pt=39040802&ct=featured&mt=8" > < img src = "/assets/img/store-badge.svg"
                        alt = {
                            gettextSub('Download from iTunes')
                        }
                        /></Link >
                        <
                        /div> <
                        /div> <
                        /div> <
                        /div>;
                    }
                    return <span / > ;
                })()
            } <
            div className = "container page" >
            <
            div className = "related-terms-container" >
            <
            h2 className = "related-title" > {
                gettextSub('Trending Tenor Searches')
            } < /h2> {
                trendingTags.length > 0 && < Carousel items = {
                    trendingTags
                }
                type = {
                    'tags'
                }
                />} <
                /div> <
                h2 > {
                        gettextSub('Featured GIFs')
                    } < /h2> <
                    div className = "homepage" >
                    <
                    div className = "center-container featured" >
                    <
                    GifList
                gifs = {
                    this.props.featuredGifs.results
                }
                loaded = {
                    this.props.featuredGifs.loaded
                }
                pending = {
                    this.props.featuredGifs.pending
                }
                itemsExhaustedCallback = {
                    this.getMoreFeaturedResults
                }
                /> <
                /div> <
                /div> <
                /div> <
                /div>
            );
        }
    }