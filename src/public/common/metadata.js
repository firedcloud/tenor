import {
    autobind
} from 'core-decorators';

import {
    Component,
    render
} from 'inferno'; // eslint-disable-line no-unused-vars
import {
    document
} from './util';


const classname = 'dynamic';


export class Metadata extends Component {
    constructor(props, context) {
        super(props, context);
        this.handleNewProps(props, this.state);

        this.head = null;
        if (process.env.BROWSER) {
            this.head = document.getElementsByTagName('head')[0];
        }
    }
    componentWillUpdate(nextProps, state) {
        this.handleNewProps(nextProps, state);
    }
    handleNewProps(props, state) {
        props.children = props.children ? props.children : [];
        props.children = Array.isArray(props.children) ? props.children : [props.children];
    }
    @autobind
    addElement(child) {
        if (Array.isArray(child)) {
            child.forEach(this.addElement);
            return;
        }
        if (!child || child.type === null) {
            return;
        }
        child.className = classname;
        this.context.response.htmlMetadata.push(child);
    }
    render() {
        // Remove added elements.

        // We have to expose this on the context for the ssr-common code to
        // have access.
        this.context.response.htmlMetadata = [];
        if (process.env.BROWSER) {
            const els = this.head.getElementsByClassName(classname);
            // Using `Array.from` shouldn't be necessary, but is: https://github.com/zloirock/core-js/issues/37
            for (const el of Array.from(els)) {
                el.remove();
            }
        }

        const page = this.props.page;
        // Standard page metadata
        const defaultMetadata = [ <
            title > {
                page.title || ''
            } < /title>, <
            link rel = "canonical"
            href = {
                page.canonicalURL || ''
            }
            />, <
            meta name = "keywords"
            content = {
                page.keywords || ''
            }
            />, <
            meta name = "description"
            content = {
                page.description || page.title || ''
            }
            />, <
            meta name = "twitter:title"
            content = {
                page.title || ''
            }
            />, <
            meta name = "twitter:description"
            content = {
                page.description || page.title || ''
            }
            />, <
            meta name = "twitter:site"
            content = "@gifkeyboard" / > , <
            meta name = "twitter:app:name:iphone"
            content = "GIF Keyboard" / > , <
            meta name = "twitter:app:name:ipad"
            content = "GIF Keyboard" / > , <
            meta name = "twitter:app:name:googleplay"
            content = "GIF Keyboard" / > , <
            meta name = "twitter:app:id:iphone"
            content = "917932200" / > , <
            meta name = "twitter:app:id:ipad"
            content = "917932200" / > , <
            meta name = "twitter:app:id:googleplay"
            content = "com.riffsy.FBMGIFApp" / > , <
            meta property = "al:ios:app_name"
            content = "GIF Keyboard" / > , <
            meta property = "al:ios:app_store_id"
            content = "917932200" / > , <
            meta property = "al:android:package"
            content = "com.riffsy.FBMGIFApp" / > , <
            meta property = "al:android:app_name"
            content = "GIF Keyboard" / > , <
            meta property = "fb:app_id"
            content = "374882289330575" / > , <
            meta property = "og:site_name"
            content = "Tenor" / > , <
            meta property = "og:title"
            content = {
                page.title || ''
            }
            />,
        ];
        if (page.noindex) {
            defaultMetadata.push( < meta name = "robots"
                content = "noindex" / > );
        }
        if (!this.props.hideIOSUpsell) {
            defaultMetadata.push( < meta name = "apple-itunes-app"
                content = {
                    `app-id=917932200,app-argument=${page.canonicalURL || ''}`
                }
                />);
            }
            defaultMetadata.forEach(this.addElement);

            // Add new elements.
            this.props.children.forEach(this.addElement);

            if (process.env.BROWSER) {
                // Doing this instead of importing inferno-server's `renderToString`
                // reduces our final, minified build size by ~15kb.
                const element = document.createElement('div');
                let metadataStr = '';

                for (const item of this.context.response.htmlMetadata) {
                    render(item, element);
                    metadataStr += element.innerHTML;
                }
                this.head.insertAdjacentHTML('beforeend', metadataStr);
            }
            return null;
        }
    }