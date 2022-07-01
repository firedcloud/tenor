import {
    Component
} from 'inferno'; // eslint-disable-line no-unused-vars

import {
    CustomComponent,
    Link
} from '../../common/components';
import {
    escapeQuotes
} from '../../common/util';

import './ProfileImage.scss';

const PROFILE_BACKGROUND_COLORS = [
    ['#84fab0', '#8fd3f4'],
    ['#848cfa', '#8fd3f4'],
    ['#848cfa', '#f48f8f'],
    ['#fa84fa', '#f48f8f'],
    ['#fa84fa', '#8f9af4'],
    ['#6bacfa', '#5ff5d6'],
    ['#faf76b', '#f55f9d'],
    ['#fab06b', '#352ef5'],
    ['#6be8fa', '#352ef5'],
    ['#6bcffa', '#a447f5'],
    ['#fa6b6b', '#a447f5'],
    ['#fa6b6b', '#f5e847'],
    ['#6bdafa', '#47f5b8'],
    ['#fa3939', '#f516da'],
    ['#6ba1fa', '#f55fe3'],
    ['#fadc6b', '#f55fe3'],
    ['#6bfaca', '#b15ff5'],
    ['#836bfa', '#d65ff5'],
    ['#fa6bf6', '#f55f5f'],
    ['#6bfa77', '#5fd3f5'],
    ['#6bfab7', '#5f97f5'],
    ['#fa6b6b', '#f5a75f'],
    ['#6bfaf4', '#f45ff5'],
    ['#eeff00', '#f55f5f'],
    ['#00edff', '#5f6af5'],
    ['#ff0000', '#ae5ff5'],
];

export class ProfileImage extends CustomComponent {
    static getBackgroundGradient(username) {
        const index = username.toUpperCase()[0].charCodeAt(0) % 26;
        const colors = PROFILE_BACKGROUND_COLORS[index];
        return `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`;
    }

    render() {
        const {
            user
        } = this.props;
        const style = this.props.style || {};
        const hasAvatar = user.avatars['256'].indexOf('default') < 0;
        if (hasAvatar) {
            style['backgroundImage'] = escapeQuotes(`url("${user.avatars['256']}")`);
        } else {
            style['backgroundImage'] = ProfileImage.getBackgroundGradient(user.username);
        }

        return ( <
            Link rel = "author"
            to = {
                this.linkToProfile(user)
            }
            disabled = {
                this.props.disableLinkToProfile
            } >
            <
            div className = "ProfileImage"
            style = {
                style
            } > {
                hasAvatar ? '' : user.username.toUpperCase()[0]
            } <
            /div> <
            /Link>
        );
    }
}