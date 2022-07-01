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
import googleAuthService from '../../common/services/googleAuthService';
import {
    getArticleLDJSON,
    isMobile,
    iOS,
    safelySerializeJSON
} from '../../common/util';

import {
    GifList
} from '../components/GifList';
import {
    gifOGMeta
} from '../components/gifOGMeta';
import {
    UpsellPill
} from '../components/UpsellPill';

import {
    ProfilePageHeader
} from '../components/ProfilePageHeader';
import {
    BrandedPartnerCategory
} from './profilePartner';

import {
    subscribe,
    transformProps
} from '../../../replete';

import './packs.scss';


@transformProps((props) => {
    props.id = props.match.params.id;

    return props;
})
@subscribe({
    pack: ['api.collections.byId.*', 'id'],
})
export class CollectionPage extends Page {
    constructor(props, context) {
        super(props, context);
        this.requiredScopes = [googleAuthService.TENOR_SCOPE];
        this.permissionText = 'You need to sign in with your Google account in order to use packs.';
    }
    pageChanged(nextProps) {
        return nextProps.id !== this.props.id;
    }
    propsNeedProcessing(nextProps) {
        for (const key of ['pack']) {
            if (nextProps[key] !== this.props[key]) {
                return true;
            }
        }
        return false;
    }
    pageInit(props) {
        this.ttl = CONSTANTS.PACK_PAGE_TTL;

        this.setCanonicalURL(this.linkToCollection(props.id));
    }
    processNewProps(props) {
        const gettextSub = this.context.gtService.gettextSub;

        if (!props.id) {
            return;
        }
        const body = props.pack;

        // We can't check if the length is less than this.context.apiService.LIMIT, because
        // sometimes the API returns less than the limit, even when there's
        // more results.
        if (!body.results.length && body.loaded) {
            this.context.response.keepPage = true;
            this.return404();
        }

        const titleFragment = props.pack.name;
        this.title = gettextSub('{titleFragment} GIF Pack', {
            titleFragment
        });
        this.h1_title = gettextSub('{titleFragment} GIF Pack', {
            titleFragment
        });
        this.description = gettextSub('Popular {titleFragment} GIF Pack for your conversation. Discover and Share the best GIFs on Tenor.', {
            titleFragment
        });
        this.keywords = `${props.pack.name.split(' ').join(',')},gifs,pack,collection`;
    }
    return404() {
        this.context.response.status = 404;
    }

    /**
     * Get more gif results using the next parameter
     */
    @autobind
    getMorePackResults() {
        this.context.store.call(
            'api.collections.byId.*', [this.props.id],
            'more'
        );
    }
    renderPage() {
        const gettextSub = this.context.gtService.gettextSub;

        let buttontxt = '';
        const {
            pack
        } = this.props;
        const gifs = pack.results;
        if (pack) {
            if (pack.user && pack.user.username) {
                buttontxt = gettextSub('Download {username}’s {packName} Pack', {
                    username: pack.user.username,
                    packName: pack.name
                });
            } else {
                buttontxt = gettextSub('Download {packName} Pack', {
                    packName: pack.name
                });
            }
        }

        let articleLDJSON = {};
        if (gifs && gifs.length) {
            articleLDJSON = getArticleLDJSON(this, gifs[0]);
        }
        return ( <
            div className = "PackPage page" >
            <
            Metadata page = {
                this
            } > {
                gifOGMeta(gifs)
            } <
            script type = "application/ld+json"
            dangerouslySetInnerHTML = {
                {
                    __html: safelySerializeJSON(articleLDJSON)
                }
            }
            /> <
            /Metadata> {
                (() => {
                        const profile = pack.user;
                        if (profile && profile.usertype === 'partner') {
                            return ( <
                                div className = {
                                    'BrandedPartnerPage'
                                } >
                                <
                                ProfilePageHeader profile = {
                                    profile
                                }
                                fullProfile = {
                                    pack
                                }
                                /> <
                                div className = "container content" > {
                                    profile.partnercategories && profile.partnercategories.map((category, i) => {
                                        return <BrandedPartnerCategory
                                        key = {
                                            i
                                        }
                                        profile = {
                                            profile
                                        }
                                        category = {
                                            category
                                        }
                                        />;
                                    })
                                } {
                                    gifs.length > 0 &&
                                        <
                                        div >
                                        <
                                        h2 className = "non-mobile-only" > {
                                            this.h1_title
                                        } < /h2> <
                                        GifList
                                    gifs = {
                                        gifs
                                    }
                                    loaded = {
                                        pack.loaded
                                    }
                                    pending = {
                                        pack.pending
                                    }
                                    itemsExhaustedCallback = {
                                        this.getMorePackResults
                                    }
                                    /> <
                                    /div>
                                } <
                                UpsellPill origin = 'packs' / >
                                <
                                /div> <
                                /div>
                            );
                        }
                        return ( <
                            div className = "container" >
                            <
                            div className = "center-container heading-wrapper" >
                            <
                            h1 > {
                                this.h1_title
                            } < /h1> <
                            /div> <
                            div className = "center-container search packs" >
                            <
                            GifList gifs = {
                                gifs
                            }
                            loaded = {
                                pack.loaded
                            }
                            pending = {
                                pack.pending
                            }
                            itemsExhaustedCallback = {
                                this.getMorePackResults
                            }
                            /> {
                                isMobile() && iOS() && < div className = "ios-banner" >
                                    <
                                    p > {
                                        buttontxt
                                    } < /p> <
                                    Link to = {
                                        `riffsykeyboard:///packs/${this.props.id}`
                                    } > Download Pack < /Link> <
                                    /div> } <
                                    /div> <
                                    /div>
                            );
                        })()
                } <
                /div>
            );
        }
    }