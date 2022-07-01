import {
    Component
} from 'inferno'; // eslint-disable-line no-unused-vars

import {
    Link,
    Page
} from '../../../common/components';
import {
    Metadata
} from '../../../common/metadata';

import './about-us.scss';


export class AboutUsPage extends Page {
    pageInit(props) {
        const gettextSub = this.context.gtService.gettextSub;

        this.title = gettextSub('About Us');
        this.keywords = 'about,us';
    }
    renderPage() {
        const gettextSub = this.context.gtService.gettextSub;

        return ( <
            div className = "about-us" >
            <
            Metadata page = {
                this
            }
            /> <
            div >
            <
            div className = "intro" >
            <
            p > {
                gettextSub('More than 300M people use Tenor every month to communicate with an animated GIF that expresses their exact thoughts or feelings.')
            } < /p> <
            div className = "stats" >
            <
            div > < span > 300 M + < /span><span>{gettextSub('monthly users')}</span > < /div> <
            div > < span > 12 B + < /span><span>{gettextSub('searches every month')}</span > < /div> <
            /div> <
            /div> <
            img className = "phone"
            src = "/assets/img/about/about-us/hero-phone.png" / >
            <
            /div> <
            div >
            <
            h2 > {
                gettextSub('Tenor is everywhere')
            } < /h2> <
            div className = "logos mobile-only" >
            <
            div > < img src = "/assets/img/about/about-us/apipartners/google.png"
            width = "66"
            height = "22" / > < /div> <
            div > < img src = "/assets/img/about/about-us/apipartners/kik.png"
            width = "44"
            height = "22" / > < /div> <
            div > < img src = "/assets/img/about/about-us/apipartners/facebook.png"
            width = "90"
            height = "18" / > < /div> <
            div > < img src = "/assets/img/about/about-us/apipartners/apple.png"
            width = "26"
            height = "30" / > < /div> <
            div > < img src = "/assets/img/about/about-us/apipartners/linkedin.png"
            width = "86"
            height = "22" / > < /div> <
            div > < img src = "/assets/img/about/about-us/apipartners/whatsapp.png"
            width = "92"
            height = "22" / > < /div> <
            div > < img src = "/assets/img/about/about-us/apipartners/discord.png"
            width = "87"
            height = "24" / > < /div> <
            div > < img src = "/assets/img/about/about-us/apipartners/twitter.png"
            width = "31"
            height = "26" / > < /div> <
            /div>

            <
            div className = "logos non-mobile-only small" >
            <
            div > < img src = "/assets/img/about/about-us/apipartners/hitbox.png"
            width = "118"
            height = "38" / > < /div> <
            div > < img src = "/assets/img/about/about-us/apipartners/intercom.png"
            width = "130"
            height = "36" / > < /div> <
            div > < img src = "/assets/img/about/about-us/apipartners/touchpal.png"
            width = "105"
            height = "23" / > < /div> <
            div > < img src = "/assets/img/about/about-us/apipartners/zynga.png"
            width = "125"
            height = "33" / > < /div> <
            div > < img src = "/assets/img/about/about-us/apipartners/dropbox.png"
            width = "123"
            height = "36" / > < /div> <
            div > < img src = "/assets/img/about/about-us/apipartners/microsoft.png"
            width = "139"
            height = "32" / > < /div> <
            div > < img src = "/assets/img/about/about-us/apipartners/fleksy.png"
            height = "40" / > < /div> <
            /div> <
            div className = "logos non-mobile-only" >
            <
            div > < img src = "/assets/img/about/about-us/apipartners/layer.png"
            width = "144"
            height = "43" / > < /div> <
            div > < img src = "/assets/img/about/about-us/apipartners/gboard.png"
            width = "74"
            height = "74" / > < /div> <
            div > < img src = "/assets/img/about/about-us/apipartners/kik.png"
            width = "79"
            height = "40" / > < /div> <
            div > < img src = "/assets/img/about/about-us/apipartners/discord.png"
            width = "158"
            height = "43" / > < /div> <
            div > < img src = "/assets/img/about/about-us/apipartners/twitter.png"
            width = "56"
            height = "47" / > < /div> <
            div > < img src = "/assets/img/about/about-us/apipartners/baidu.png"
            height = "50" / > < /div> <
            div > < img src = "/assets/img/about/about-us/apipartners/whatsapp.png"
            width = "167"
            height = "39" / > < /div> <
            div > < img src = "/assets/img/about/about-us/apipartners/facebook.png"
            width = "163"
            height = "33" / > < /div> <
            div > < img src = "/assets/img/about/about-us/apipartners/apple.png"
            width = "47"
            height = "55" / > < /div> <
            div > < img src = "/assets/img/about/about-us/apipartners/linkedin.png"
            width = "156"
            height = "39" / > < /div> <
            div > < img src = "/assets/img/about/about-us/apipartners/messenger.png"
            width = "48"
            height = "48" / > < /div> <
            /div> <
            div className = "api" >
            <
            Link to = "/gifapi"
            external = {
                true
            }
            dangerouslySetInnerHTML = {
                {
                    __html: gettextSub('Learn more about the <span>Tenor GIF API</span>.')
                }
            } > < /Link> <
            /div> <
            div className = "press" >
            <
            h2 > {
                gettextSub('People are talking about Tenor.')
            } < /h2> <
            div className = "articles" >
            <
            Link to = "https://www.forbes.com/forbes/welcome/?toURL=https://www.forbes.com/sites/kathleenchaykowski/2017/09/19/inside-tenors-plan-to-power-gif-sharing-on-every-mobile-phone/&refURL=&referrer=#131a3e213ee9" >
            <
            p > {
                `How Tenor aims to get GIF-sharing onto every mobile phone`
            } < /p> <
            img src = "/assets/img/about/about-us/press/forbes.png"
            height = "24" / >
            <
            /Link> <
            Link to = "https://www.cnn.com/2017/12/05/us/gif-most-used-in-2017-trnd/index.html" >
            <
            p > {
                `The most popular GIF of 2017 actually perfectly sums up 2017`
            } < /p> <
            img src = "/assets/img/about/about-us/press/cnn.png"
            height = "24" / >
            <
            /Link> <
            Link className = "non-mobile-only"
            to = "https://www.bloomberg.com/news/articles/2018-03-12/there-s-a-reason-you-re-seeing-those-donut-gifs" >
            <
            p > {
                `There's a reason you're seeing those doughnut GIFs`
            } < /p> <
            img src = "/assets/img/about/about-us/press/bloomberg.png"
            height = "24" / >
            <
            /Link> <
            Link className = "non-mobile-only"
            to = "https://techcrunch.com/2018/02/20/tenor-hits-12b-searches-in-its-gif-keyboard-every-month/" >
            <
            p > {
                `Tenor hits 12B GIF searches every month`
            } < /p> <
            img src = "/assets/img/about/about-us/press/techcrunch.png"
            height = "24" / >
            <
            /Link> <
            /div> <
            Link to = "/press" > {
                gettextSub('See all Press')
            } < /Link> <
            /div> <
            /div> <
            div >
            <
            h2 > {
                gettextSub('Tenor Apps')
            } < /h2> <
            p > {
                gettextSub('We make it easy to find and share the right GIF across devices. Tenor is the #1 downloaded and used GIF-sharing app on both iOS and Android.')
            } < /p> <
            img src = "/assets/img/about/about-us/tenor-apps.png" / >
            <
            div className = "apps-bleed" > < /div> <
            /div> <
            div >
            <
            h2 className = "mobile-only" > {
                gettextSub('Tenor Content Partners')
            } < /h2> <
            div className = "content" >
            <
            div className = "p" >
            <
            h2 className = "non-mobile-only" > {
                gettextSub('Tenor Content Partners')
            } < /h2> <
            p > {
                gettextSub('Top movie studios, TV networks, game publishers, sports leagues and storytellers team with Tenor to drive mobile shares and views of their GIFs.')
            } < /p> <
            Link className = "non-mobile-only"
            to = "/contentpartners" > {
                gettextSub('Learn more')
            } < /Link> <
            /div> <
            div className = "logos" >
            <
            span > < img src = "/assets/img/about/about-us/partners/showtime.png"
            width = "116"
            height = "42" / > < /span> <
            span > < img src = "/assets/img/about/about-us/partners/fox.png"
            width = "112"
            height = "40" / > < /span> <
            span > < img src = "/assets/img/about/about-us/partners/fc-bayern-munich.png"
            width = "60"
            height = "60" / > < /span> <
            span > < img src = "/assets/img/about/about-us/partners/nbc.png"
            width = "56"
            height = "55" / > < /span> <
            span > < img src = "/assets/img/about/about-us/partners/vevo.png"
            width = "98"
            height = "25" / > < /span> <
            span > < img src = "/assets/img/about/about-us/partners/netflix.png"
            width = "112"
            height = "30" / > < /span> <
            span > < img src = "/assets/img/about/about-us/partners/viacom.png"
            width = "120"
            height = "18" / > < /span> <
            span > < img src = "/assets/img/about/about-us/partners/wb.png"
            width = "56"
            height = "57" / > < /span> <
            /div> <
            /div> <
            Link className = "mobile-only"
            to = "/contentpartners" > {
                gettextSub('Learn more')
            } < /Link> <
            /div> <
            div >
            <
            h2 className = "mobile-only" > {
                gettextSub('Meet the Team')
            } < /h2> <
            img src = "/assets/img/about/about-us/founders.gif" / >
            <
            div className = "content" >
            <
            h2 className = "non-mobile-only" > {
                gettextSub('Meet the Team')
            } < /h2> <
            p > {
                gettextSub('Tenor was founded in 2014 by a team of successful entrepreneurs with a vision to define a new visual language for the world\'s 3+ billion mobile users.')
            } < /p> <
            p dangerouslySetInnerHTML = {
                {
                    __html: gettextSub('Tenor is backed by marquee investors including <strong>Redpoint Ventures</strong>, <strong>Menlo Ventures</strong>, <strong>Tenaya Capital</strong>, <strong>OCA Ventures</strong>, <strong>Signia Ventures</strong>, <strong>Cowboy Ventures</strong> and others.')
                }
            } > < /p> <
            /div> <
            /div> <
            /div>
        );
    }
}