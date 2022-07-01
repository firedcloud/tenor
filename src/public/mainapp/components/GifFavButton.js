import {
    autobind
} from 'core-decorators';

import emitter from 'tiny-emitter/instance';

import {
    Component
} from 'inferno'; // eslint-disable-line no-unused-vars

import {
    CustomComponent
} from '../../common/components';
import {
    FavButton
} from '../../common/components/Icon';
import authService from '../../common/services/authService';


export class GifFavButton extends CustomComponent {
    constructor(props, context) {
        super(props, context);
        this.state.selected = false;
        this.state.animated = false;
        if (process.env.BROWSER) {
            this.updateButtonState();
        }
    }

    componentDidMount() {
        emitter.on('authDataSet', this.updateButtonState);
        emitter.on('favoriteDataSet', this.updateButtonState);
    }

    componentDidUpdate(prevProps) {
        if (this.props.gif.id !== prevProps.gif.id) {
            this.updateButtonState();
        }
    }

    componentWillUnmount() {
        emitter.off('authDataSet', this.updateButtonState);
        emitter.off('favoriteDataSet', this.updateButtonState);
    }

    @autobind
    updateButtonState() {
        if (authService.isLoggedIn()) {
            this.setState({
                selected: this.context.cacheService.isFavorite(this.props.gif),
            });
        } else {
            this.setState({
                selected: false,
            });
        }
    }

    @autobind
    toggle() {
        console.log('GifFavButton.toggle', this.props.gif.id, this.state.selected);
        this.context.apiService.setFavorite({
            gif: this.props.gif,
            remove: this.state.selected,
        });
        if (!this.state.selected) {
            this.setState({
                animated: true,
                selected: true
            });
            window.setTimeout(() => {
                this.setState({
                    animated: false
                });
            }, 400);
        } else {
            this.setState({
                selected: false
            });
        }
    }

    @autobind
    onClick() {
        const gettextSub = this.context.gtService.gettextSub;
        if (authService.isLoggedIn()) {
            // Favoriting requires a linked account with the Tenor scope.
            if (authService.hasLinkedAccount() && authService.hasTenorOAuthScope()) {
                this.toggle();
            } else {
                if (authService.hasLinkedAccount()) {
                    // Need to refresh scope.
                    authService.showScopeRefreshDialog({
                        permissionText: gettextSub('Before we can modify your favorites, you must grant Tenor the proper permissions on your Google Account.')
                    });
                } else {
                    // Need to link account.
                    authService.showAccountLinkingFavoritingDialog();
                }
            }
        } else {
            authService.showLoginDialog();
        }
    }

    render() {
        return ( <
            FavButton className = {
                `GifFavButton${this.state.selected ? ' selected' : ''}${this.state.animated ? ' animated' : ''}`
            }
            onClick = {
                this.onClick
            }
            />
        );
    }
}