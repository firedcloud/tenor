import {
    Component
} from 'inferno'; // eslint-disable-line no-unused-vars
import {
    Tooltip
} from '../../common/components';

import './OfficialBadge.scss';

export class OfficialBadge extends Component {
    constructor(props, context) {
        super(props, context);
        const gettextSub = context.gtService.gettextSub;
        this.badges = {
            'artist': {
                msg: gettextSub('Official Artist'),
                img: `/assets/img/badge-artist.svg`,
            },
            'partner': {
                msg: gettextSub('Official Partner'),
                img: `/assets/img/badge-partner.svg`,
            },
        };
    }

    getUserType() {
        const {
            flags
        } = this.props;
        if (!flags || !flags.includes('partner')) {
            return 'user';
        } else if (flags.includes('artist')) {
            // NOTE artists also have partner flag
            return 'artist';
        } else if (flags.includes('partner')) {
            // NOTE: includes influencers
            return 'partner';
        }
    }

    render() {
        const {
            tooltip
        } = this.props;
        const userType = this.getUserType();

        if (userType === 'user') {
            return <span / > ;
        }

        const hoverMsg = this.badges[userType].msg;
        const imgSrc = this.badges[userType].img;

        return ( <
            span className = "OfficialBadge" >
            {
                tooltip && < Tooltip hoverMsg = {
                    hoverMsg
                }
                /> } <
                img
                className = "badge-image"
                src = {
                    imgSrc
                }
                /> <
                /span>
            );
        }
    }