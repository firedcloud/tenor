import {
    Component
} from 'inferno'; // eslint-disable-line no-unused-vars
import {
    CustomComponent
} from '../../../common/components';
import {
    AutoScrollCarousel
} from '../Carousel';
import {
    subscribe
} from '../../../../replete';
import storageService from '../../../common/services/storageService';

import './StaticImageDialog.scss';

@subscribe({
    isMobile: ['ui.isMobile'],
})
export class StaticImageDialog extends CustomComponent {
    constructor(props, context) {
        super(props, context);
        storageService.setItem('staticImageBetaDialogViewed', Date.now());
    }
    render() {
        const gettextSub = this.context.gtService.gettextSub;

        return ( <
            div id = "static-image-dialog" >
            <
            AutoScrollCarousel assets = {
                [
                    '/assets/img/static-img-carousel/cardib-meme.png',
                    '/assets/img/static-img-carousel/dog-meme.png',
                    '/assets/img/static-img-carousel/cat-meme.png',
                ]
            }
            interval = {
                4000
            }
            speed = {
                750
            }
            imageAspectRatio = {
                480 / 337
            }
            imgHeightMin = {
                .9
            }
            imgHeightMax = {
                1
            }
            randomStart = {
                true
            }
            imgMargin = {
                this.props.isMobile ? 8 : 16
            }
            /> <
            h2 > {
                gettextSub(`Introducing...`)
            } < /h2> <
            p > {
                gettextSub(`Tenor now accepts JPG and PNG files. Any you
                upload will be private to you for now, and we plan to add them
                to search results in the future.`)
            } < /p> <
            div className = "button-row" >
            <
            button onClick = {
                this.props.dialog.close
            } > {
                gettextSub(`Start Uploading`)
            } <
            /button> <
            /div> <
            /div>
        );
    }
}