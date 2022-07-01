import {
    autobind
} from 'core-decorators';
import {
    Component
} from 'inferno'; // eslint-disable-line no-unused-vars

import {
    Link,
    Page
} from '../../../common/components';
import {
    CONSTANTS
} from '../../../common/config';
import {
    Metadata
} from '../../../common/metadata';
import {
    TopBar
} from '../../components/TopSearchBar';
import {
    window,
    document
} from '../../../common/util';

import partners from './partners.txt';

import './partner-spotlight.scss';
import '../../components/Tag.scss';


let inView = null;
if (process.env.BROWSER) {
    inView = require('in-view');
}


const PARTNERS = {
    'fox': '20th Century Fox',
    'dreamworks': 'Dreamworks',
    'bayern': 'Bayern Munich',
    'sony': 'Sony Picture',
    'mtv': 'MTV',
    'nickelodeon': 'Nickelodeon',
    'lionsgate': 'Lionsgate',
    'nbc': 'NBC',
    'netflix': 'Netflix',
    'showtime': 'Showtime',
    'foxsports': 'Fox Sports',
    'cosmopolitan': 'Cosmopolitan',
    'esquire': 'Esquire',
    'universal': 'Universal Pictures',
    'vevo': 'Vevo',
    'wb': 'Warner Brothers',
};

const SECTIONS = [
    'intro',
    'partners',
    'tenor',
    'contact',
    'more-partners',
];

export class PartnerSpotlightPage extends Page {
    pageInit() {
        const gettextSub = this.context.gtService.gettextSub;
        const localizeUrlPath = this.context.gtService.localizeUrlPath;

        this.title = gettextSub('Tenor Content Partners');
        this.keywords = 'partners,business development,about,brands,partner spotlights';
        this.setCanonicalURL(localizeUrlPath('/contentpartners'));
        this.scrollTimeout = null;
    }
    componentDidMount() {
        window.addEventListener('scroll', this.handleScroll);
    }
    componentWillUnmount() {
        window.removeEventListener('scroll', this.handleScroll);
    }
    @autobind
    handleScroll() {
        if (this.scrollTimeout) {
            window.clearTimeout(this.scrollTimeout);
        }
        if (inView) {
            inView.threshold(0.1);
            this.scrollTimeout = window.setTimeout(function() {
                const checkPoint = window.innerHeight / 10;
                for (const section of SECTIONS) {
                    const rect = document.getElementById(section).getBoundingClientRect();
                    const top = rect.top;
                    const bottom = rect.top + rect.height;
                    if (top < checkPoint && bottom > checkPoint) {
                        window.history.replaceState(null, '', `#${section}`);
                        return;
                    }
                    window.history.replaceState(null, '', `#intro`);
                }
            }, 300);
        }
    }

    renderPage() {
        const gettextSub = this.context.gtService.gettextSub;
        const gettextSubComponent = this.context.gtService.gettextSubComponent;

        const shornContactHref = `mailto:shorn@${CONSTANTS.MAIL_DOMAIN}?subject=Partner%20Inbound!`;
        return ( <
            div className = "partner-spotlight" >
            <
            Metadata page = {
                this
            }
            /> <
            TopBar preventMobileSticky = {
                true
            } >
            <
            div className = "container header-menu" >
            <
            Link className = "header-link"
            to = "#intro" > {
                gettextSub('Fuel fandom with Tenor')
            } <
            /Link> <
            Link className = "header-link"
            to = "#partners" > {
                gettextSub('Partner Spotlight')
            } <
            /Link> <
            Link className = "header-link"
            to = "#tenor" > {
                gettextSub('The Tenor Advantage')
            } <
            /Link> <
            Link className = "header-link"
            to = "#contact" > {
                gettextSub('Get Started')
            } <
            /Link> <
            Link className = "header-link"
            to = "#more-partners" > {
                gettextSub('More Partners')
            } <
            /Link> <
            /div> <
            /TopBar> <
            div className = "section"
            id = "intro" >
            <
            div className = "container" >
            <
            h1 > {
                gettextSub('Tenor drives mobile GIF sharing for top entertainment brands')
            } < /h1> <
            br / >
            <
            div style = {
                {
                    fontSize: '18px'
                }
            } >
            <
            p > {
                gettextSub('Movie studios, TV networks, story-tellers, game publishers and sports leagues turn to Tenor to connect with consumers in mobile, driving GIF views and shares that fuel:')
            } < /p> <
            ul >
            <
            li dangerouslySetInnerHTML = {
                {
                    __html: gettextSub('<b>Ticket sales</b> for opening weekend and beyond')
                }
            } > < /li> <
            li dangerouslySetInnerHTML = {
                {
                    __html: gettextSub('<b>Tune-in</b> to season premiers, sweeps and finales')
                }
            } > < /li> <
            li dangerouslySetInnerHTML = {
                {
                    __html: gettextSub('<b>Sustain engagement</b> with key franchises in between installments and seasons')
                }
            } > < /li> <
            /ul> <
            /div> <
            /div> <
            /div> <
            div className = "section"
            id = "partners" >
            <
            div className = "container" >
            <
            h1 > {
                gettextSub('Partner Spotlight')
            } < /h1> <
            div className = "responsive-tag-container" > {
                Object.keys(PARTNERS).map((partner) => {
                    return ( <
                        div className = "responsive-tag-wrapper" >
                        <
                        div className = "partner-card" >
                        <
                        div className = "partner-image"
                        style = {
                            {
                                backgroundImage: `url('/assets/img/about/partnerSpotlight/${partner}.jpg')`,
                            }
                        }
                        /> <
                        div className = "partner-name" > {
                            PARTNERS[partner]
                        } < /div> <
                        /div> <
                        /div>
                    );
                })
            } <
            div className = "responsive-tag-wrapper" >
            <
            Link to = "#more-partners"
            className = "partner-card" >
            <
            div className = "partner-icon" > ➜ < /div> <
            div className = "partner-name" > {
                gettextSub('See More')
            } < /div> <
            /Link> <
            /div> <
            /div> <
            /div> <
            div className = "sub-section" >
            <
            div className = "container" >
            <
            div className = "media-section non-mobile-only" >
            <
            Link to = "/search/justice-league" >
            <
            img src = "/assets/img/about/partnerSpotlight/justice-league-insights.png"
            style = {
                {
                    width: '90%'
                }
            }
            /> <
            /Link> <
            /div> <
            div className = "info-section" >
            <
            h2 > Warner Brothers < /h2> <
            p > {
                gettextSubComponent('For the upcoming {justicLeagueLink} film, Warner Brothers turned to Tenor to feature GIFs from the hotly-anticipated trailer. In less than 5 days after trailer release, Tenor generated over 90 million views and hundreds of thousands of direct shares of {justicLeagueLink} GIF content, driving an engagement spike when it mattered most.', {
                    justicLeagueLink: < Link to = {
                        this.linkToSearch('justice league')
                    } > Justice League < /Link>,
                })
            } <
            /p> <
            /div> <
            div className = "media-section mobile-only" >
            <
            Link to = "/search/justice-league" >
            <
            img src = "/assets/img/about/partnerSpotlight/justice-league-insights.png"
            style = {
                {
                    width: '90%'
                }
            }
            /> <
            /Link> <
            /div> <
            /div> <
            /div> <
            div className = "sub-section" >
            <
            div className = "container" >
            <
            div className = "info-section" >
            <
            h2 > Netflix < /h2> <
            p > {
                gettextSubComponent('The challenge of {netflixLink} tune-in is clearly different from linear television. GIFs for Netflix shows tend to trend in the weeks building up to release, so Netflix has teamed with Tenor to drive social momentum using GIFs, creating sustained tune-in for its shows {narcosLink}, {dearwhitepeopleLink}, {masterofnoneLink}, {thecrownLink}, and the upcoming Will Smith feature film, {brightLink}.', {
                    netflixLink: < Link to = {
                        this.linkToSearch('netflix')
                    } > Netflix < /Link>,
                    narcosLink: < Link to = {
                        this.linkToSearch('narcos')
                    } > Narcos < /Link>,
                    dearwhitepeopleLink: < Link to = {
                        this.linkToSearch('dear white people')
                    } > Narcos < /Link>,
                    masterofnoneLink: < Link to = {
                        this.linkToSearch('master of none')
                    } > Master of None < /Link>,
                    thecrownLink: < Link to = {
                        this.linkToSearch('the crown')
                    } > The Crown < /Link>,
                    brightLink: < Link to = {
                        this.linkToSearch('bright')
                    } > Bright < /Link>,
                })
            } <
            /p> <
            /div> <
            div className = "media-section" >
            <
            Link to = "/view/narcos-narcosgif-wagnermoura-pabloescobar-gif-8457048"
            external = {
                true
            } >
            <
            img src = "https://media.tenor.com/images/6704cd2cb66c4a52b2d73c50ff258a4b/tenor.gif"
            style = {
                {
                    position: 'absolute',
                    height: '45%',
                    top: '0',
                    left: '60px',
                }
            }
            /> <
            /Link> <
            Link to = "/view/dearwhitepeople-dearwhitepeoplegifs-loganbrowning-samanthawhite-gif-8468527"
            external = {
                true
            } >
            <
            img src = "https://media.tenor.com/images/62b476a60270c172b8dfe49388115bf9/tenor.gif"
            style = {
                {
                    position: 'absolute',
                    height: '45%',
                    top: '42px',
                    right: '0',
                }
            }
            /> <
            /Link> <
            Link to = "/view/masterofnone-masterofnonegifs-azizansari-gif-8265921"
            external = {
                true
            } >
            <
            img src = "https://media.tenor.com/images/e8acefdcea42a7e6e54490271fad6149/tenor.gif"
            style = {
                {
                    position: 'absolute',
                    height: '45%',
                    bottom: '0',
                    left: '36px',
                }
            }
            /> <
            /Link> <
            /div> <
            /div> <
            /div> <
            div className = "sub-section" >
            <
            div className = "container" >
            <
            div className = "media-section non-mobile-only" >
            <
            Link to = "/view/billions-billionsgifs-damianlewis-bobbyaxelrod-ferrari-gif-8252661"
            external = {
                true
            } > < img src = "https://media.tenor.com/images/f897206c3b472be3f680c85846ab94a0/tenor.gif"
            style = {
                {
                    position: 'absolute',
                    height: '50%',
                    top: '10px',
                    left: '10px',
                }
            }
            /></Link >
            <
            Link to = "/view/fingerguns-dexter-dextermorgan-michaelchall-gif-3561803"
            external = {
                true
            } > < img src = "https://media.tenor.com/images/511b5c874a3ca7879dea97e481a18dee/tenor.gif"
            style = {
                {
                    position: 'absolute',
                    height: '50%',
                    bottom: '20px',
                    right: '35px',
                }
            }
            /></Link >
            <
            /div> <
            div className = "info-section" >
            <
            h2 > Showtime < /h2> <
            p > {
                gettextSubComponent('Showtime has found valuable Tenor Insights for its new show {billionsLink} and also had recent success with working with Tenor on resurfacing {dexterLink} content for the 10-year anniversary of the series. In addition to showcasing trending on-air content, tapping into legacy content and assembling a GIF strategy that rekindles consumer excitement is a strong suit of the Tenor Partner Success Team.', {
                    billionsLink: < Link to = {
                        this.linkToSearch('billions')
                    } > Billions < /Link>,
                    dexterLink: < Link to = "/view/dexter10-dexter-dexter-gifs-boat-gif-6073074" > Dexter < /Link>,
                })
            } <
            /p> <
            /div> <
            div className = "media-section mobile-only" >
            <
            Link to = "/view/billions-billionsgifs-damianlewis-bobbyaxelrod-ferrari-gif-8252661"
            external = {
                true
            } > < img src = "https://media.tenor.com/images/f897206c3b472be3f680c85846ab94a0/tenor.gif"
            style = {
                {
                    position: 'absolute',
                    height: '50%',
                    top: '10px',
                    left: '10px',
                }
            }
            /></Link >
            <
            Link to = "/view/fingerguns-dexter-dextermorgan-michaelchall-gif-3561803"
            external = {
                true
            } > < img src = "https://media.tenor.com/images/511b5c874a3ca7879dea97e481a18dee/tenor.gif"
            style = {
                {
                    position: 'absolute',
                    height: '50%',
                    bottom: '20px',
                    right: '35px',
                }
            }
            /></Link >
            <
            /div> <
            /div> <
            /div> <
            /div> <
            div className = "section"
            id = "tenor" >
            <
            div className = "container" >
            <
            div className = "info-section" >
            <
            h1 > {
                gettextSub('The Tenor Advantage')
            } < /h1> <
            p > {
                gettextSub('Serving more than 200 million monthly active users and processing more than 200 million daily search requests, Tenor is the largest and fastest-growing mobile GIF-sharing platform. Our GIF Keyboard app is the most-downloaded in its category on both iOS and Android. And we power GIF-sharing for partners including Apple iMessage, Facebook Messenger, WhatsApp, Google Gboard, Kik, LinkedIn, Touchpal and others.')
            } <
            /p> <
            p > {
                gettextSubComponent('The {emotionlGraphLink} maps 4 billion distinct search terms to the GIFs that say it best. As a Tenor content partner, we’ll integrate your GIFs into this powerful matching engine and surface your content in relevant search results -- making it easy for consumers to find, share and enjoy it.', {
                    emotionlGraphLink: < Link to = "/emotional-graph"
                    external = {
                        true
                    } > {
                        gettextSub('Tenor Emotional Graph')
                    } < /Link>,
                })
            } <
            /p> <
            p > {
                gettextSub('As a Tenor Partner you’ll benefit from:')
            } <
            /p> <
            ul >
            <
            li dangerouslySetInnerHTML = {
                {
                    __html: gettextSub('<b>Unprecedented insight</b> into how people express themselves visually using GIFs')
                }
            } > < /li> <
            li dangerouslySetInnerHTML = {
                {
                    __html: gettextSub('<b>Unmatched mobile distribution</b> platform across messaging experiences')
                }
            } > < /li> <
            li dangerouslySetInnerHTML = {
                {
                    __html: gettextSub('<b>Unwavering commitment</b> to partnership success, including content curation and promotion')
                }
            } > < /li> <
            /ul> <
            /div> <
            div className = "media-section non-mobile-only" >
            <
            br / > < br / > < br / > < br / > < br / >
            <
            div className = "major-text" > {
                gettextSub('300M+')
            } < /div> <
            div className = "major-sub-text" > {
                gettextSub('DAILY Search Requests')
            } < /div> <
            br / > < br / > < br / >
            <
            div className = "major-text" > {
                gettextSub('300M+')
            } < /div> <
            div className = "major-sub-text" > {
                gettextSub('Monthly Active Users')
            } < /div> <
            /div> <
            /div> <
            /div> <
            div className = "section"
            id = "contact" >
            <
            div className = "container" >
            <
            h1 > {
                gettextSub('Get Started')
            } < /h1> <
            p > {
                gettextSubComponent(
                    'The Tenor Partner Success team will work closely with you to create and curate GIF content well-suited to driving consumer engagement in mobile messaging. We’ll ingest your content into our system and optimize it for mobile delivery. The {emotionlGraphLink} will map your content to relevant search terms and surface it when our 200+ million users are looking for just the right GIF to communicate their thoughts and feelings with family and friends.', {
                        emotionlGraphLink: < Link to = "/emotional-graph"
                        external = {
                            true
                        } > {
                            gettextSub('Tenor Emotional Graph')
                        } < /Link>,
                    }
                )
            } <
            /p> <
            p > {
                gettextSubComponent(
                    'Step one: Let’s talk! {contactUsLink} now to get started in fueling fandom with mobile GIF sharing.', {
                        contactUsLink: < Link to = {
                            shornContactHref
                        } > {
                            gettextSub('Contact us')
                        } < /Link>,
                    }
                )
            } <
            /p> <
            br / >
            <
            div style = {
                {
                    textAlign: 'center'
                }
            } >
            <
            Link to = {
                shornContactHref
            }
            className = "contact-button" > {
                gettextSub('Contact Us')
            } <
            /Link> <
            /div> <
            /div> <
            /div> <
            div className = "section"
            id = "more-partners" >
            <
            div className = "container" >
            <
            h1 > {
                gettextSub('Additional Tenor Partners')
            } < /h1> <
            ul className = "partners-list" > {
                partners.split('\n').map((partner) => {
                    return ( <
                        li > {
                            partner
                        } < /li>
                    );
                })
            } <
            /ul> <
            /div> <
            /div> <
            /div>
        );
    }
}