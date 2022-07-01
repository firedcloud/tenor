import {
    Component
} from 'inferno'; // eslint-disable-line no-unused-vars
import {
    Link,
    CustomComponent
} from '../../common/components';
import {
    escapeQuotes
} from '../../common/util';
import {
    ProfileImage
} from './ProfileImage';
import {
    OfficialBadge
} from './OfficialBadge';
import {
    subscribe
} from '../../../replete';

import './ProfilePageHeader.scss';

@subscribe({
    isMobile: ['ui.isMobile'],
})
export class ProfilePageHeader extends CustomComponent {
    renderCta(profile) {
        const hasCta = profile.partnercta && profile.partnercta.text && profile.partnercta.url;
        if (hasCta) {
            return ( <
                Link external = {
                    true
                }
                to = {
                    profile.partnercta.url
                } >
                <
                div className = "white-button cta-button" > {
                    profile.partnercta.text
                } <
                /div> <
                /Link>
            );
        }
    }

    renderLinks(profile) {
        if (profile.partnerlinks) {
            return profile.partnerlinks.map((link) => {
                    const imageAssets = ['earth', 'facebook', 'instagram', 'twitter', 'youtube'];
                    const icon = (link.icon && imageAssets.includes(link.icon) ? link.icon : 'link');
                    return <Link key = {
                        link.url
                    }
                    to = {
                        link.url || '/'
                    }
                    external = {
                            true
                        } >
                        <
                        div
                    className = "social-icon"
                    style = {
                            {
                                backgroundImage: escapeQuotes(`url("/assets/img/icons/brandedPartner/${icon}.svg")`),
                            }
                        } >
                        {
                            link.tooltip && < span className = "tooltip" >
                            <
                            span > {
                                link.tooltip
                            } < /span> <
                            /span>} <
                            /div> <
                            /Link>;
                        });
            }
        }

        renderNameInfo(profile) {
            const username = profile.partnername || profile.username;
            return ( <
                div className = "name-info" >
                <
                h1 className = "partnername" > {
                    username
                } <
                OfficialBadge flags = {
                    profile.flags
                }
                tooltip = {
                    true
                }
                /> <
                /h1> <
                div className = "tagline" > {
                    profile.tagline
                } < /div> <
                /div>
            );
        }

        render() {
            const {
                profile
            } = this.props;
            const backgroundStyle = {};
            if (profile.partnerbanner && profile.partnerbanner[1110]) {
                backgroundStyle['backgroundImage'] = escapeQuotes(`url("${profile.partnerbanner[1110]}")`);
            } else {
                backgroundStyle['backgroundImage'] = ProfileImage.getBackgroundGradient(profile.username);
            }

            if (this.props.isMobile) {
                return ( <
                    div className = "MobileProfilePageHeader" >
                    <
                    Link to = {
                        this.linkToProfile(profile)
                    } >
                    <
                    div className = "banner-image"
                    style = {
                        backgroundStyle
                    }
                    /> <
                    /Link> <
                    div className = "profile-details container" >
                    <
                    ProfileImage user = {
                        profile
                    }
                    /> <
                    div className = "link-actions" > {
                        this.renderCta(profile)
                    } <
                    /div> {
                        this.renderNameInfo(profile)
                    } <
                    /div> <
                    /div>
                );
            }
            return ( <
                div className = "ProfilePageHeader" >
                <
                Link to = {
                    this.linkToProfile(profile)
                } >
                <
                div className = "banner-image"
                style = {
                    backgroundStyle
                }
                /> <
                /Link> <
                div className = "profile-details" >
                <
                div className = "container" >
                <
                ProfileImage user = {
                    profile
                }
                /> {
                    this.renderNameInfo(profile)
                } <
                div className = "link-actions" > {
                    this.renderLinks(profile)
                } {
                    this.renderCta(profile)
                } <
                /div> <
                /div> <
                /div> <
                /div>
            );
        }
    }