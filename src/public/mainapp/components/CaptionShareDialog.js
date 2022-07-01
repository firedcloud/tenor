import {
    Component
} from 'inferno'; // eslint-disable-line no-unused-vars

import {
    CustomComponent
} from '../../common/components';
import {
    window,
    iOS
} from '../../common/util';
import {
    subscribe
} from '../../../replete';

import './CaptionShareDialog.scss';

@subscribe({
    isMobile: ['ui.isMobile'],
})
export class CaptionShareDialog extends CustomComponent {
    constructor(props, context) {
        super(props, context);
        this.createdGifUrl = window.URL.createObjectURL(props.gifData.file);
    }

    componentWillUnmount() {
        window.URL.revokeObjectURL(this.createdGifUrl);
    }

    renderSharingOptions() {
        const gettextSub = this.context.gtService.gettextSub;

        if (iOS() || this.props.isMobile) {
            return ( <
                div >
                <
                div className = "share-options mobile" >
                <
                div className = "touch-icon" / >
                <
                div className = "share-message" > {
                    gettextSub('Tap and hold your GIF for sharing options')
                } <
                /div> <
                /div> <
                /div>
            );
        } else {
            return ( <
                div >
                <
                div className = "share-options desktop" >
                <
                div className = "copygif-icon" / >
                <
                div className = "share-message" > {
                    gettextSub('Right-click your gif for sharing options')
                } < /div> <
                /div> <
                a className = "download-gif-button"
                onClick = {
                    () => {
                        // TODO
                        // window.ga('send', 'event', {
                        //     eventCategory: 'GifCreatorDialog',
                        //     eventAction: 'gif-downloaded',
                        // });
                    }
                }
                href = {
                    this.createdGifUrl
                }
                download = {
                    'tenor.gif'
                }
                target = '_blank'
                rel = "noopener noreferrer" >
                {
                    gettextSub('Download')
                } <
                /a> <
                /div>
            );
        }
    }

    render() {
        const gettextSub = this.context.gtService.gettextSub;
        console.log('gifData', this.props.gifData);
        return ( <
            div className = "SharingView" >
            <
            h1 > {
                gettextSub('Share Your Gif')
            } < /h1> <
            div >
            <
            img src = {
                this.createdGifUrl
            }
            width = "100%" / >
            <
            /div> {
                this.renderSharingOptions()
            } <
            /div>
        );
    }
}