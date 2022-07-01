import {
    autobind
} from 'core-decorators';

import {
    Component
} from 'inferno'; // eslint-disable-line no-unused-vars

import emitter from 'tiny-emitter/instance';

import {
    CustomComponent
} from '../../common/components';
import {
    CONSTANTS
} from '../../common/config';

import amplioDevMapping from './amplio-dev-mapping.txt';
import amplioQAMapping from './amplio-qa-mapping.txt';
import amplioProdMapping from './amplio-prod-mapping.txt';

function parseTxt(txt) {
    const o = {};
    for (const line of txt.split('\n')) {
        let [key, val] = line.split(/\s+/, 2);
        o[key] = val;
    }
    return o;
}

const amplioIdMapping = {
    'dev.tenor.com': parseTxt(amplioDevMapping),
    'qa.tenor.com': parseTxt(amplioQAMapping),
    'tenor.com': parseTxt(amplioProdMapping),
};
console.log('amplioIdMapping', amplioIdMapping);

const amplioInitCache = {};

export class BaseAmplioWidget extends CustomComponent {
    componentDidMount() {
        this.add();
    }
    componentWillUnmount() {
        this.remove();
    }
    componentWillUpdate(nextProps, state) {
        if (this.arePropsDifferent(nextProps)) {
            this.remove().then(() => {
                this.add();
            });
        }
    }
    arePropsDifferent(nextProps) {
        return nextProps.title !== this.props.title || nextProps.username !== this.props.username;
    }
    @autobind
    setContainer(element) {
        this.container = element;
    }
    getCountryAllowed() {
        return this.context.countryCode === 'US' || CONSTANTS.NGINX_HOST !== 'tenor.com';
    }
    getMappedAmplioId() {
        return amplioIdMapping[CONSTANTS.NGINX_HOST][this.props.username];
    }
    getCacheKey() {
        return `${this.getMappedAmplioId()}|${this.props.title}`;
    }
    emitAmplioCacheModified() {
        let count = 0;
        for (const n of Object.values(amplioInitCache)) {
            count += n;
        }
        emitter.emit('amplioCacheModified', {
            count
        });
    }
    amplioInit(subscriptions, mappedAmplioId) {
        const key = this.getCacheKey(mappedAmplioId);
        if (!amplioInitCache[key]) {
            subscriptions.init({
                type: 'CreativeWork',
                isPartOfType: ['CreativeWork', 'Product'],
                isPartOfProductId: `${mappedAmplioId}:default`,
                buttonPosition: 'floating',
                postTitle: this.props.title,
            }, true, false);
            amplioInitCache[key] = 0;
        }
        this.emitAmplioCacheModified();
    }
    @autobind
    add() {
        const enableAmplioWidgets = this.context.featureFlags.enableAmplioWidgets;
        const amplioCountryAllowed = this.getCountryAllowed();
        const mappedAmplioId = this.getMappedAmplioId();
        if (process.env.BROWSER && enableAmplioWidgets && amplioCountryAllowed && mappedAmplioId) {
            (self.SWG_BASIC = self.SWG_BASIC || []).push((subscriptions) => {
                this.amplioInit(subscriptions, mappedAmplioId);
                this.remove().then(() => {
                    this.addSpecific(subscriptions);
                    const key = this.getCacheKey(this.getMappedAmplioId());
                    if (amplioInitCache.hasOwnProperty(key)) {
                        amplioInitCache[key]++;
                        this.emitAmplioCacheModified();
                    }
                });
            });
        }
    }

    @autobind
    remove() {
        return new Promise((resolve) => {
            if (process.env.BROWSER) {
                (self.SWG_BASIC = self.SWG_BASIC || []).push((subscriptions) => {
                    this.removeSpecific(subscriptions);
                    const key = this.getCacheKey(this.getMappedAmplioId());
                    if (amplioInitCache[key]) {
                        amplioInitCache[key]--;
                        if (amplioInitCache[key] === 0) {
                            delete amplioInitCache[key];
                        }
                        this.emitAmplioCacheModified();
                    }
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
}

export class FloatingTwgButton extends BaseAmplioWidget {
    @autobind
    addSpecific(subscriptions) {
        subscriptions.addFloatingTwgButton();
    }

    @autobind
    removeSpecific(subscriptions) {
        subscriptions.removeTwgButtons();
    }
    render() {
        return <div / > ;
    }
}

export class TwgCounter extends BaseAmplioWidget {
    @autobind
    addSpecific(subscriptions) {
        this.container.innerHTML = '<div counter-button="true" style="height: 34px; visibility: hidden; box-sizing: content-box; padding: 12px 0; display: inline-block; overflow: hidden;"></div>';
        subscriptions.addTwgCounter();
    }

    @autobind
    removeSpecific(subscriptions) {
        subscriptions.removeTwgCounter();
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
    render() {
        return <div id = "amplio-counter-container"
        ref = {
            this.setContainer
        }
        />;
    }
}

export class TwgThankWall extends BaseAmplioWidget {
    @autobind
    addSpecific(subscriptions) {
        this.container.innerHTML = '<div twg-thank-wall="true" style="width: 100%; height: 460px; min-height: 150px; overflow: hidden; border: 1px solid #e3e3e3; border-radius: 15px; margin: 5px 0 20px;"></div>';
        subscriptions.addTwgThankWall();
    }

    @autobind
    removeSpecific(subscriptions) {
        subscriptions.removeTwgThankWall();
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
    render() {
        return <div id = "amplio-wall-container"
        ref = {
            this.setContainer
        }
        />;
    }
}