/* global rx*/
/* eslint-disable brace-style */
import {
    Component
} from 'inferno'; // eslint-disable-line no-unused-vars
import {
    autobind
} from 'core-decorators';
import {
    Link,
    Page
} from '../../../common/components';
import {
    Metadata
} from '../../../common/metadata';

import './mac.scss';


export class MacPage extends Page {
    pageInit() {
        this.title = 'GIF Keyboard for Mac by Tenor | Tenor GIF Keyboard';
        this.keywords = 'mac,ios,tenor';
    }

    @autobind
    download() {
        rx.macsplash.download('');
        this.context.apiService.oldAPI('GET', '/keyboard.registermacdl');
    }

    renderPage() {
        return ( <
            div className = "mac-body os-mac browser-chrome desktopview" >
            <
            Metadata page = {
                this
            } >
            <
            link rel = "stylesheet"
            type = "text/css"
            href = "/assets/mac/reset_a5dcc3f.css" / >
            <
            link rel = "stylesheet"
            type = "text/css"
            href = "/assets/mac/page_436db4f.css" / >
            <
            link rel = "stylesheet"
            type = "text/css"
            href = "/assets/mac/macsplash_7399334.css" / >
            <
            script type = "text/javascript"
            async = ""
            src = "https://www.google-analytics.com/ga.js" > < /script> <
            /Metadata> <
            div className = "container" >
            <
            div className = "top" >
            <
            div className = "switch" >
            <
            Link className = "keyboardswitch"
            to = "https://tenor.com/" >
            GIF Keyboard < /Link> | <
            span className = "macswitch active"
            href = "/mac" >
            GIF Keyboard
            for Mac <
            /span></div >
            <
            div className = "page" >
            <
            div className = "pagedetail" >
            <
            h1 className = "title" >
            <
            img alt = "GIF Keyboard for Mac"
            width = "500"
            height = "43"
            src = "/assets/mac/mactitle2.png" / >
            <
            /h1> <
            div className = "description" >
            <
            p > Send GIFs and videos < br / > straight from your Mac. < /p> <
            /div> <
            /div> <
            div className = "laptop" >
            <
            img src = "/assets/mac/gfmacpreview.gif"
            width = "680"
            height = "425" / >
            <
            /div> <
            /div> <
            div className = "cta extrapad" >
            <
            Link className = "download"
            to = "https://media.tenor.com/mac/bin/GIFforMac.dmg"
            onClick = {
                this.download
            } >
            Download Now < /Link>

            <
            Link className = "storedownload"
            to = "https://itunes.apple.com/us/app/gif-keyboard/id1043270657?ls=1&amp;mt=12"
            onClick = {
                function() {
                    rx.anal.trackevent({
                        category: 'gifformac',
                        action: 'headerappstoredownload'
                    });
                }
            } >
            <
            img src = "/assets/mac/macappstore.png"
            width = "256"
            height = "62"
            alt = "Download on the Mac App Store" / > < /Link>

            <
            Link className = "legacydownload"
            to = "https://media.tenor.com/mac/bin/GIFforMac_Legacy.dmg" > On an OS version earlier than 10.11 ? Download here < /Link> <
            /div> <
            div className = "page altpage" >
            <
            div className = "pagedetail" >
            <
            div className = "description" >
            <
            p >
            <
            span className = "big" > The easiest way < /span><br/ >
            <
            span className = "small" > to share GIFs with your best friends < /span> <
            /p> <
            /div> <
            /div> <
            div className = "laptop" >
            <
            img src = "/assets/mac/macss1.gif"
            width = "680"
            height = "425" / >
            <
            /div> <
            /div> <
            div className = "page" >
            <
            div className = "pagedetail" >
            <
            div className = "description" >
            <
            p >
            <
            span className = "big" > Drag and drop < /span><br/ >
            <
            span className = "small" > GIFs directly into iMessage < /span> <
            /p> <
            /div> <
            /div> <
            div className = "laptop" >
            <
            img src = "/assets/mac/macss2.gif"
            width = "680"
            height = "425" / >
            <
            /div> <
            /div> <
            div className = "page altpage" >
            <
            div className = "pagedetail" >
            <
            div className = "description" >
            <
            p >
            <
            span className = "big" > Save GIFs quickly < /span><br/ >
            <
            span className = "small" > by dragging them into the menu bar < /span> <
            /p> <
            /div> <
            /div> <
            div className = "laptop" >
            <
            img src = "/assets/mac/macss3.gif"
            width = "680"
            height = "425" / >
            <
            /div> <
            /div> <
            div className = "cta extrapad" >
            <
            Link className = "download"
            to = "https://media.tenor.com/mac/bin/GIFforMac.dmg"
            onClick = {
                this.download
            } >
            Download Now < /Link>

            <
            Link className = "storedownload"
            to = "https://itunes.apple.com/us/app/gif-keyboard/id1043270657?ls=1&amp;mt=12"
            onClick = {
                function() {
                    rx.anal.trackevent({
                        category: 'gifformac',
                        action: 'headerappstoredownload'
                    });
                }
            } >
            <
            img src = "/assets/mac/macappstore.png"
            width = "256"
            height = "62"
            alt = "Download on the Mac App Store" / > < /Link>

            <
            /div>

            <
            /div>

            <
            div className = "content" >
            <
            div className = "steps" >
            <
            h1 > Install Steps < /h1> <
            div className = "step step1" >
            <
            div className = "stepinner" >
            <
            h2 > < Link className = "download"
            to = "https://media.tenor.com/mac/bin/GIFforMac.dmg"
            onClick = {
                this.download
            } >
            Download Now < /Link> <
            /h2> <
            p >
            Download and open the.dmg in your Downloads folder. <
            /p> <
            /div> <
            /div> <
            div className = "step step2" >
            <
            img className = "preview"
            src = "/assets/mac/dragtoapps.gif"
            width = "378"
            height = "215" / >
            <
            div className = "stepinner" >
            <
            h2 > Drag to Applications Folder < /h2> <
            p >
            GIF Keyboard
            for Mac will now be in your Applications folder!
            <
            /p> <
            /div> <
            /div> <
            div className = "step step3" >
            <
            img className = "preview"
            src = "/assets/mac/popup.gif"
            width = "378"
            height = "215" / >
            <
            div className = "stepinner" >
            <
            h2 > Open from Applications < /h2> <
            p > {
                'Look for GIF Keyboard for Mac in the "popup" menu above your screen!'
            } <
            /p> <
            /div> <
            /div> <
            /div> <
            div className = "bottomcta" >
            <
            Link className = "download"
            to = "https://media.tenor.com/mac/bin/GIFforMac.dmg"
            onClick = {
                this.download
            } >
            Download Now < /Link>

            <
            Link className = "storedownload"
            to = "https://itunes.apple.com/us/app/gif-keyboard/id1043270657?ls=1&amp;mt=12"
            onClick = {
                function() {
                    rx.anal.trackevent({
                        category: 'gifformac',
                        action: 'headerappstoredownload'
                    });
                }
            } >
            <
            img src = "/assets/mac/macappstore.png"
            width = "256"
            height = "62"
            alt = "Download on the Mac App Store" / > < /Link>

            <
            /div> <
            div className = "protip" >
            <
            span className = "bold" > Pro - tip : < /span>
            Open GIF Keyboard
            for Mac with a keyboard shortcut!
            Open GIF Keyboard
            for Mac and select preferences to set a shortcut. <
            /div>

            <
            /div> <
            /div>

            <
            script type = "text/javascript"
            src = "/assets/mac/rx_ff4f10f.js" > < /script> <
            script type = "text/javascript"
            src = "/assets/mac/util_971cd71.js" > < /script> <
            script type = "text/javascript"
            src = "/assets/mac/anal_8e02d83.js" > < /script> <
            script type = "text/javascript"
            src = "/assets/mac/macsplash_12d8f82.js" > < /script> <
            /div>
        );
    }
}