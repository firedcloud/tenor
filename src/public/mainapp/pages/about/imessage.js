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
import {
    window
} from '../../../common/util';

import './imessage.scss';


export class IMessagePage extends Page {
    pageInit() {
        const gettextSub = this.context.gtService.gettextSub;

        this.title = gettextSub('GIF Keyboard for iMessage by Tenor | Tenor GIF Keyboard');
        this.keywords = 'imessage,tenor';
        this.buttonURL = 'https://itunes.apple.com/us/app/gif-keyboard/id917932200?mt=8?app=messages';
    }

    fbTrackClick() {
        // Facebook Conversion Code for Messages App Download - tenor.com/imessage
        window.fbq('track', '6055908028802', {
            'value': '0.00',
            'currency': 'USD'
        });
    }
    renderPage() {
        const gettextSub = this.context.gtService.gettextSub;

        const buttonURL = this.buttonURL;
        const gifKeyboardLogo = '<img src="/assets/img/gif-keyboard-logo.svg" alt="GIF Keyboard" height="25" width="197"/>';
        return ( <
            div className = "imessage" >
            <
            Metadata page = {
                this
            }
            /> <
            div >
            <
            h1 dangerouslySetInnerHTML = {
                {
                    __html: gettextSub('{gifKeyboardLogo} for iMessage', {
                        gifKeyboardLogo
                    })
                }
            } >
            <
            /h1> <
            Link className = "download-btn"
            onClick = {
                this.fbTrackClick
            }
            to = {
                buttonURL
            } > {
                gettextSub('Download')
            } < /Link> <
            /div> <
            div >
            <
            h2 > {
                gettextSub('Turn GIFs Into Stickers')
            } < /h2> <
            div >
            <
            img src = "/assets/img/about/imessage/screenshot1.jpg" / >
            <
            div >
            <
            p > {
                gettextSub('Create Stickers from any GIF. Drag and drop them onto your iMessage conversations.')
            } <
            /p> <
            Link className = "download-btn"
            onClick = {
                this.fbTrackClick
            }
            to = {
                buttonURL
            } > {
                gettextSub('Download')
            } < /Link> <
            /div> <
            /div> <
            /div> <
            div >
            <
            h2 > {
                gettextSub('Create GIFs')
            } < /h2> <
            div >
            <
            div >
            <
            p > {
                gettextSub('Make your own GIFs with your front or back facing camera — just tap the camera button to activate! Personalize your captured GIFs with text, a handwritten note or drawings.')
            } <
            /p> <
            Link className = "download-btn"
            onClick = {
                this.fbTrackClick
            }
            to = {
                buttonURL
            } > {
                gettextSub('Download')
            } < /Link> <
            /div> <
            img src = "/assets/img/about/imessage/screenshot2.jpg" / >
            <
            /div> <
            /div> <
            div >
            <
            h2 > {
                gettextSub('Share Packs')
            } < /h2> <
            div >
            <
            img src = "/assets/img/about/imessage/screenshot3.jpg" / >
            <
            div >
            <
            p > {
                gettextSub('Create packs of your favorite GIFs and stickers that you can easily share with friends and family.')
            } <
            /p> <
            Link className = "download-btn"
            onClick = {
                this.fbTrackClick
            }
            to = {
                buttonURL
            } > {
                gettextSub('Download')
            } < /Link> <
            /div> <
            /div> <
            /div> <
            /div>
        );
    }
}