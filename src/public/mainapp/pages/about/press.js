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

import './press.scss';

import pressSites from './pressSites.json';
import pressQuotes from './pressQuotes.json';


export class PressPage extends Page {
    pageInit() {
        const gettextSub = this.context.gtService.gettextSub;

        this.title = gettextSub('Tenor in the Press');
        this.keywords = 'press,testimonials,about';
        this.sites = JSON.parse(pressSites);
        this.quotes = JSON.parse(pressQuotes);
    }

    renderPage() {
        const gettextSub = this.context.gtService.gettextSub;

        const quoteElements = [];
        for (const quote of this.quotes) {
            const site = this.sites[quote.site];
            quoteElements.push( < li >
                <
                div className = {
                    site.useText ? 'sitename' : 'sitelogo'
                } >
                <
                Link to = {
                    quote.url
                } > {
                    site.useText ?
                    <
                    h2 > {
                        site.name
                    } < /h2> : <
                    img
                    src = {
                        `/assets/img/about/press/${quote.site}.${site.svg ? 'svg' : 'png'}`
                    }
                    width = "150"
                    alt = {
                        site.name
                    }
                    />
                } <
                /Link> <
                /div> <
                div className = "quotearea" >
                <
                h2 className = "title" >
                <
                Link to = {
                    quote.url
                }
                target = "_blank" > {
                    quote.title
                } < /Link> <
                /h2> {
                    quote.quote && !quote.noquotationmarks &&
                        <
                        blockquote > < p > {
                            quote.quote
                        } < /p></blockquote >
                } {
                    quote.quote && quote.noquotationmarks &&
                        <
                        p > {
                            quote.quote
                        } < /p>
                } <
                /div> <
                /li>);
            }
            return <div className = "about-press container page" >
                <
                Metadata page = {
                    this
                }
            /> <
            div className = "presstitle" >
                <
                h1 > {
                    this.title
                } < /h1> <
                /div> <
                div className = "buttons-container" >
                <
                Link className = "assets"
            to = "https://media.tenor.com/website/press-assets/index.html" > {
                    gettextSub('Download Press Assets')
                } < /Link> <
                Link className = "contact"
            to = {
                    '/contact?topic=press'
                } > Contact Us < /Link> <
                /div> <
                ul className = "quotes" > {
                    quoteElements
                } <
                /ul> <
                /div>;
        }
    }