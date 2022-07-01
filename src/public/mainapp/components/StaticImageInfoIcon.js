import {
    Component
} from 'inferno'; // eslint-disable-line no-unused-vars
import {
    autobind
} from 'core-decorators';
import {
    CustomComponent,
    Tooltip,
    TooltipWrapper
} from '../../common/components';
import {
    Icon
} from '../../common/components/Icon';

import './StaticImageInfoIcon.scss';

class StaticImageInfoComponent extends CustomComponent {
    @autobind
    textMapping(type) {
        const gettextSub = this.context.gtService.gettextSub;
        const mapping = {
            'gifmaker-landing': {
                header: gettextSub(`Tenor now accepts JPG & PNG.`),
                text: gettextSub(`They will be private to you for now, but we plan to add these uploads to search results in the future`),
            },
            'giflist': {
                header: gettextSub('JPEG and PNG Files'),
                text: gettextSub('We plan to add these uploads to search results in the future.'),
            },
            'item-view': {
                header: gettextSub('JPEG and PNG Files'),
                text: gettextSub('We plan to add these uploads to search results in the future.'),
            },
        };
        return mapping[type];
    }
}

export class StaticImageInfoIcon extends StaticImageInfoComponent {
    render() {
        const {
            type
        } = this.props;

        return ( <
            span className = {
                `StaticImageInfoIcon ${type}`
            }
            onTouchStart = {
                () => {}
            } // HACK: iOS css "hover" trigger
            >
            <
            Tooltip >
            <
            span > {
                this.textMapping(type).header &&
                <
                h2 > {
                    this.textMapping(type).header
                } < /h2>
            } <
            p > {
                this.textMapping(type).text
            } <
            /p> <
            /span> <
            /Tooltip> {
                /* NOTE The info icon in GifLists uses a different svg (white
                                    background vs transparent). This svg does not properly convert
                                    to a font icon so we're using an <img> element instead.*/
            } {
                type === 'giflist' ?
                    <
                    img src = "/assets/icons/info-outline-thin-icon.svg" / > :
                    <
                    Icon name = 'info-outline-icon' / >
            } <
            /span>
        );
    }
}

export class StaticImageInfoWrapper extends StaticImageInfoComponent {
    render() {
        const {
            type,
            children
        } = this.props;

        const msg = ( <
            span className = 'static-beta-tooltip-content' >
            <
            img src = "/assets/icons/static-image-icon.svg" / >
            <
            div className = 'content-right' > {
                this.textMapping(type).header &&
                <
                h2 > {
                    this.textMapping(type).header
                } < /h2>
            } <
            p > {
                this.textMapping(type).text
            } <
            /p> <
            /div> <
            /span>
        );

        return ( <
            span className = {
                `StaticImageInfoWrapper ${type}`
            } >
            <
            TooltipWrapper tooltipMsg = {
                msg
            } >
            {
                children
            } <
            /TooltipWrapper> <
            /span>
        );
    }
}