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

import './legal.scss';


export class LGLegalPrivacyRedirect extends Page {
    pageInit() {
        this.redirect('https://policies.google.com/privacy?hl=en-US');
    }
}


export class LGLegalDataUsagePage extends Page {
    pageInit() {
        this.title = 'Tenor Data Usage';
        this.keywords = 'data usage';
    }

    renderPage() {
        return ( <
            div className = "about-legal container page" >
            <
            Metadata page = {
                this
            }
            /> <
            h1 > {
                this.title
            } < /h1> <
            p >
            Use of Tenor on LG is subject to the < Link to = {
                'https://policies.google.com/privacy'
            } > Google Privacy Policy < /Link> <
            /p>

            <
            /div>
        );
    }
}