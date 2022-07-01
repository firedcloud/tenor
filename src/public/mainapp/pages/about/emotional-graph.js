import {
    Component
} from 'inferno'; // eslint-disable-line no-unused-vars

import {
    Copybox,
    Page
} from '../../../common/components';
import {
    Metadata
} from '../../../common/metadata';


export class EmotionalGraphPage extends Page {
    pageInit() {
        const gettextSub = this.context.gtService.gettextSub;

        this.title = gettextSub('Tenor Emotional Graph');
        this.keywords = 'emotional,graph,big data,data analysis';
    }

    renderPage() {
        const gettextSub = this.context.gtService.gettextSub;

        const linkText = gettextSub('Tenor Emotional Graph');
        const embedHTML = `<div class="tenor-embed" data-type="emotional-graph" data-share-method="host" data-width="100%" data-aspect-ratio="1"><a href="https://tenor.com/emotional-graph">${linkText}</a></div><script type="text/javascript" async src="https://tenor.com/embed.js"></script>`;
        return ( <
            div className = "EmotionalGraphPage container page" >
            <
            Metadata page = {
                this
            }
            /> <
            h1 > {
                this.title
            } < /h1> <
            div style = {
                {
                    position: 'relative',
                    width: '100%',
                    paddingTop: '100%'
                }
            } >
            <
            iframe className = "emotional-graph"
            frameborder = "0"
            allowtransparency = "true"
            allowfullscreen = "true"
            scrolling = "no"
            style = {
                {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%'
                }
            }
            src = "/embed/emotional-graph" /
            >
            <
            /div> <
            div style = {
                {
                    padding: '15px'
                }
            } >
            <
            h2 > {
                gettextSub('Embed')
            } < /h2> <
            Copybox value = {
                embedHTML
            }
            /> <
            /div> <
            /div>
        );
    }
}