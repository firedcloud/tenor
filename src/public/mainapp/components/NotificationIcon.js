import {
    autobind
} from 'core-decorators';

import {
    Component
} from 'inferno'; // eslint-disable-line no-unused-vars

import {
    CustomComponent,
    Link
} from '../../common/components';
import {
    Icon
} from '../../common/components/Icon';
import {
    ToggleMenu
} from '../../common/components/ToggleMenu';
import {
    cleanMultiwordTag,
    localURL
} from '../../common/util';

import rootScope from '../services/rootScope';

let pendingNotifications = 0;

function clearPendingNotificationsCount() {
    pendingNotifications = 0;
}

const secondsInADay = 24 * 60 * 60;
const oneWeekAgo = 7 * secondsInADay;


class NotificationsListItem extends CustomComponent {
    @autobind
    handleClick(event) {
        const localizeUrlPath = this.context.gtService.localizeUrlPath;

        this.props.notification.pending = false;
        this.triggerUpdate();
        // Prevent sub links from incorrectly redirecting.
        if (!event.target.href && this.props.notification.url) {
            this.context.router.history.push(localizeUrlPath(localURL(this.props.notification.url)));
        }
    }
    render() {
            const notification = this.props.notification;
            let classes = 'item notification';
            if (notification.pending) {
                classes += ' pending';
            }
            const msg = notification.msg;
            let htmlMsg = msg;
            // FIXME: we'll need to change this is if support translated notifications.
            if (htmlMsg.slice(-9) === 'your GIF!' || notification.type === 'keyboarduserfollow') {
                // link username
                const firstSpaceIdx = htmlMsg.indexOf(' ');
                const username = htmlMsg.substring(0, firstSpaceIdx);
                const remainder = htmlMsg.substring(firstSpaceIdx);
                htmlMsg = [ < Link key = "link"
                    to = {
                        this.linkToProfile({
                            username
                        })
                    } > {
                        username
                    } < /Link>, remainder];
                }
                else {
                    htmlMsg = [];
                    const tagRegex = /#(\w+)/g;
                    const tagLinks = [];
                    msg.replace(tagRegex, (match, tag) => {
                            tag = cleanMultiwordTag(tag);
                            tagLinks.push( < Link to = {
                                    this.linkToSearch(tag)
                                } > {
                                    tag
                                } < /Link>);
                                return match;
                            }); msg.split(/#\w+/g).forEach(function(val, idx) {
                            htmlMsg.push(val);
                            if (tagLinks[idx]) {
                                htmlMsg.push(tagLinks[idx]);
                            }
                        });
                    }
                    let imgSrc = '';
                    if (notification.image) {
                        imgSrc = notification.image.url;
                    } else if (notification.avatarurl) {
                        imgSrc = notification.avatarurl;
                    }
                    return ( < a onClick = {
                            this.handleClick
                        }
                        className = {
                            classes
                        } >
                        <
                        img src = {
                            imgSrc
                        }
                        width = "40"
                        height = "40" / >
                        <
                        span className = "msg" > {
                            htmlMsg
                        } < /span> <
                        span className = "timestamp" > {
                            rootScope.humanize(notification.timestamp)
                        } < /span> <
                        /a>);
                    }
                }

                class NotificationsList extends Component {
                    constructor(props, context) {
                        super(props, context);
                        this.divideNotifications();
                    }
                    componentDidUpdate(prevProps, state) {
                        this.divideNotifications();
                    }
                    divideNotifications() {
                        const thisMorning = rootScope.tzOffset + Math.floor((Date.now() / 1000) / secondsInADay) * secondsInADay;
                        const yesterdayMorning = thisMorning - secondsInADay;

                        this.todayNotifications = [];
                        this.yesterdayNotifications = [];
                        this.earlierNotifications = [];
                        // Divide all notifications into categories.
                        for (let i = 0; i < this.props.notifications.length; i++) {
                            const notification = this.props.notifications[i];
                            if (notification.timestamp > thisMorning) {
                                this.todayNotifications.push(notification);
                            } else if (notification.timestamp > yesterdayMorning) {
                                this.yesterdayNotifications.push(notification);
                            } else {
                                this.earlierNotifications.push(notification);
                            }
                        }
                    }
                    render() {
                            const gettextSub = this.context.gtService.gettextSub;

                            let classes = 'notifications-list';
                            if (this.props.notifications.length) {
                                classes += ' has-notifications';
                            } else {
                                classes += ' no-notifications';
                            }

                            const todayNotificationsEls = [];
                            let notification;
                            for (notification of this.todayNotifications) {
                                todayNotificationsEls.push( < NotificationsListItem notification = {
                                        notification
                                    }
                                    />);
                                }

                                const yesterdayNotificationsEls = [];
                                for (notification of this.yesterdayNotifications) {
                                    yesterdayNotificationsEls.push( < NotificationsListItem notification = {
                                            notification
                                        }
                                        />);
                                    }

                                    const earlierNotificationsEls = [];
                                    for (notification of this.earlierNotifications) {
                                        earlierNotificationsEls.push( < NotificationsListItem notification = {
                                                notification
                                            }
                                            />);
                                        }

                                        return ( < div className = {
                                                    classes
                                                } > {
                                                    todayNotificationsEls.length > 0 && < h3 className = "item" > {
                                                        gettextSub('Today')
                                                    } < /h3> } {
                                                        todayNotificationsEls.length > 0 && todayNotificationsEls
                                                    } {
                                                        yesterdayNotificationsEls.length > 0 && < h3 className = "item" > {
                                                            gettextSub('Yesterday')
                                                        } < /h3> } {
                                                            yesterdayNotificationsEls.length > 0 && yesterdayNotificationsEls
                                                        } {
                                                            earlierNotificationsEls.length > 0 && < h3 className = "item" > {
                                                                gettextSub('Earlier')
                                                            } < /h3> } {
                                                                earlierNotificationsEls.length > 0 && earlierNotificationsEls
                                                            } {
                                                                !this.props.notifications.length > 0 && < div className = "item" >
                                                                    <
                                                                    p > {
                                                                        gettextSub('Upload GIFs, and you’ll get notifications when people share or favorite them')
                                                                    } < /p> <
                                                                    Link to = {
                                                                        '/gif-maker?utm_source=empty-notifications&utm_medium=internal&utm_campaign=gif-maker-entrypoints'
                                                                    }
                                                                className = "button" > {
                                                                        gettextSub('Upload')
                                                                    } <
                                                                    /Link> <
                                                                    /div> } <
                                                                    /div>);
                                                            }
                                                        }


                                                        export class NotificationIcon extends CustomComponent {
                                                            constructor(props, context) {
                                                                super(props, context);

                                                                this.state.notifications = [];

                                                                this.state.since = rootScope.tzOffset + (Date.now() / 1000) - oneWeekAgo;
                                                                setTimeout(this.refresh, 3 * 1000);
                                                                this.intervalRef = setInterval(this.refresh, 10 * 60 * 1000);
                                                            }
                                                            componentWillUnmount() {
                                                                clearInterval(this.intervalRef);
                                                            }
                                                            @autobind
                                                            refresh() {
                                                                this.context.apiService.oldAPI('GET', '/keyboard.notifications', {
                                                                        since: this.state.since
                                                                    })
                                                                    .then(([body]) => {
                                                                        const newPending = body.pending;
                                                                        const newNotifications = body.notifications || [];

                                                                        const newState = {};

                                                                        pendingNotifications = pendingNotifications + newPending;

                                                                        newState.notifications = [].concat(newNotifications, this.state.notifications);

                                                                        if (newNotifications.length) {
                                                                            // On next refresh, we only want to fetch new notifications.
                                                                            newState.since = newNotifications[0].timestamp + 1;
                                                                        }

                                                                        // Set pending flag on new notifications. Also set html.
                                                                        for (let i = 0; i < newNotifications.length; i++) {
                                                                            if (i < newPending) {
                                                                                newNotifications[i].pending = true;
                                                                            }
                                                                        }

                                                                        this.setState(newState);
                                                                    }, function([error]) {
                                                                        console.error(error);
                                                                    });
                                                            }
                                                            @autobind
                                                            clearPendingNotificationsCount() {
                                                                clearPendingNotificationsCount();
                                                                this.triggerUpdate();
                                                            }
                                                            render() {
                                                                    const gettextSub = this.context.gtService.gettextSub;

                                                                    return ( < ToggleMenu className = "navbar-icon notifications"
                                                                            togglemenu = {
                                                                                true
                                                                            }
                                                                            onClick = {
                                                                                this.clearPendingNotificationsCount
                                                                            }
                                                                            menu = { < div className = "animated" >
                                                                                <
                                                                                h2 className = "item" > {
                                                                                    gettextSub('Notifications')
                                                                                } < /h2> <
                                                                                NotificationsList notifications = {
                                                                                    this.state.notifications
                                                                                }
                                                                                /> <
                                                                                /div>}> <
                                                                                Icon name = "notification-icon" / > {
                                                                                    pendingNotifications > 0 && < div className = "pending-notifications-count" > {
                                                                                        pendingNotifications
                                                                                    } < /div> } <
                                                                                    /ToggleMenu>);
                                                                                }
                                                                            }