import {
    Component
} from 'inferno'; // eslint-disable-line no-unused-vars

import {
    Page
} from '../../common/components';
import {
    CONSTANTS
} from '../../common/config';
import {
    Metadata
} from '../../common/metadata';
import {
    localURL,
    window
} from '../../common/util';

import {
    SearchTag
} from '../components/Tag';

import {
    subscribe,
    transformProps
} from '../../../replete';


@transformProps((props) => {
    props.searchData = props.match.params.searchData;

    return props;
})
@subscribe({
    exploreData: ['api.exploreterms.*', 'searchData'],
})
export class ExplorePage extends Page {
    pageChanged(nextProps) {
        return nextProps.searchData !== this.props.searchData;
    }
    propsNeedProcessing(nextProps) {
        for (const key of ['exploreData']) {
            if (nextProps[key] !== this.props[key]) {
                return true;
            }
        }
        return false;
    }
    pageInit(props) {
        this.ttl = CONSTANTS.SEARCH_PAGE_TTL;

        this.searchTerms = props.searchData ? this.parseURLSearchTags(props.searchData) : [];

        this.exploreData = null;

        this.title = '';
        this.h1_title = '';
        this.description = '';
        this.keywords = '';
    }
    processNewProps(props) {
        const gettextSub = this.context.gtService.gettextSub;

        if (!props.searchData) {
            return;
        }
        const body = props.exploreData;
        if (body.status === 500) {
            this.context.response.status = 500;
            return;
        }
        if (!body.results.length) {
            this.context.response.status = 404;
            return;
        }
        if (localURL(body.results[0].url).substr(0, 8) === '/search/') {
            this.context.response.status = 404;
            return;
        }
        this.exploreData = body.results[0];

        const titleFragment = this.exploreData.name;
        this.title = gettextSub('The popular {titleFragment} GIFs everyone\'s sharing', {
            titleFragment
        });
        this.h1_title = gettextSub('{titleFragment} GIFs', {
            titleFragment
        });
        this.description = gettextSub('All the popular {titleFragment} animated GIFs for your conversation. Discover and Share the best GIFs on Tenor.', {
            titleFragment
        });
        this.keywords = `${this.exploreData.name.replace(' ', ',')},gifs,explore,memes`;

        window.fbq('track', 'ViewContent', {
            content_name: this.title
        });
    }
    renderPage() {
            return ( <
                    div className = "ExplorePage container page" >
                    <
                    Metadata page = {
                        this
                    }
                    /> <
                    div className = "center-container heading-wrapper" > {
                        this.exploreData && < h1 > {
                            this.exploreData.name
                        } < /h1> } <
                        /div> {
                            this.props.searchData && < div className = "center-container explore" > {
                                this.exploreData && this.exploreData.searches.length > 0 && < div >
                                <
                                div className = "responsive-tag-container" > {
                                    this.exploreData.searches.map((tag, i) => {
                                        const {
                                            name,
                                            searchterm,
                                            image,
                                            url
                                        } = tag;
                                        return <div className = "responsive-tag-wrapper"
                                        key = {
                                                searchterm
                                            } >
                                            <
                                            SearchTag image = {
                                                image
                                            }
                                        searchterm = {
                                            searchterm
                                        }
                                        name = {
                                            name
                                        }
                                        url = {
                                            localURL(url)
                                        }
                                        /> <
                                        /div>;
                                    })
                                } <
                                /div> <
                                /div>} {
                                    this.exploreData && this.exploreData.nestedsearches.length > 0 && this.exploreData.nestedsearches.map((search) => {
                                        return <div >
                                            <
                                            h2 > {
                                                search.name
                                            } < /h2> <
                                            div className = "responsive-tag-container" > {
                                                search.searches.map((tag, i) => {
                                                    const {
                                                        name,
                                                        searchterm,
                                                        image
                                                    } = tag;
                                                    return <div className = "responsive-tag-wrapper"
                                                    key = {
                                                            searchterm
                                                        } >
                                                        <
                                                        SearchTag image = {
                                                            image
                                                        }
                                                    searchterm = {
                                                        searchterm
                                                    }
                                                    name = {
                                                        name
                                                    }
                                                    /> <
                                                    /div>;
                                                })
                                            } <
                                            /div> <
                                            /div>;
                                    })
                                } {
                                    this.exploreData && this.exploreData.quotes.length > 0 && < div >
                                        <
                                        h2 > Popular {
                                            this.exploreData.name
                                        }
                                    Quotes < /h2> <
                                        div className = "responsive-tag-container" > {
                                            this.exploreData.quotes.map((tag, i) => {
                                                const {
                                                    quote,
                                                    url,
                                                    image
                                                } = tag;
                                                return <div className = "responsive-tag-wrapper"
                                                key = {
                                                        url
                                                    } >
                                                    <
                                                    SearchTag image = {
                                                        image
                                                    }
                                                url = {
                                                    url
                                                }
                                                name = {
                                                    `"${quote}"`
                                                }
                                                /> <
                                                /div>;
                                            })
                                        } <
                                        /div> <
                                        /div>} <
                                        /div>} <
                                        /div>
                                );
                            }
                        }


                        @transformProps((props) => {
                            props.searchData = '';

                            return props;
                        })
                        @subscribe({
                            exploreData: ['api.exploreterms.*', 'searchData'],
                        })
                        export class ExploreHomePage extends Page {
                            propsNeedProcessing(nextProps) {
                                for (const key of ['exploreData']) {
                                    if (nextProps[key] !== this.props[key]) {
                                        return true;
                                    }
                                }
                                return false;
                            }
                            pageInit(props) {
                                const gettextSub = this.context.gtService.gettextSub;

                                this.title = gettextSub('Explore GIFs - Tenor GIF Keyboard');
                                this.description = gettextSub('Say more with Tenor. Find the perfect Animated GIFs and videos to convey exactly what you mean in every conversation.');
                                this.keywords = 'gifs,search gifs,share gifs,memes,explore';

                                window.fbq('track', 'ViewContent', {
                                    content_name: this.title
                                });
                            }
                            processNewProps(props) {
                                const body = props.exploreData;
                                if (body && body.results) {
                                    this.exploreData = body.results[0];
                                }
                            }

                            renderPage() {
                                const gettextSub = this.context.gtService.gettextSub;

                                return <div className = "ExploreHomePage container page" >
                                    <
                                    Metadata page = {
                                        this
                                    }
                                /> <
                                h1 > {
                                        gettextSub('Explore GIFs')
                                    } < /h1> <
                                    div className = "responsive-tag-container" > {
                                        this.exploreData && this.exploreData.searches.length > 0 && this.exploreData.searches.map((tag, i) => {
                                            const {
                                                name,
                                                searchterm,
                                                image,
                                                url
                                            } = tag;
                                            return <div key = {
                                                i
                                            }
                                            className = "responsive-tag-wrapper" >
                                                <
                                                SearchTag
                                            image = {
                                                image
                                            }
                                            url = {
                                                localURL(url) || `/search/${searchterm}`
                                            }
                                            name = {
                                                name
                                            }
                                            /> <
                                            /div>;
                                        })
                                    } <
                                    /div> <
                                    /div>;
                            }
                        }