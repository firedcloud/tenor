import {
    Component
} from 'inferno'; // eslint-disable-line no-unused-vars

import {
    getApiService
} from './services/apiService';
import {
    getCacheService
} from './services/cacheService';
import translation from './translation';

import {
    TagsDataSource,
    FeaturedGifsDataSource,
    GifsDataSource,
    RelatedGifsDataSource,
    PacksDataSource,
    CollectionsDataSource,
    SearchDataSource,
    SearchStickersDataSource,
    ExploreTermsDataSource,
    SearchSuggestionsDataSource,
    SearchGifsByUsernameDataSource,
    SearchStickersByUsernameDataSource,
    ProfileDataSource,
} from './datasources';
import {
    GifMakerPageDataSource,
    GifEditorDataSource,
    ProfilePageDataSource,
} from './ui-datasources';

import {
    Store
} from '../../replete';

export const CONSTANTS = {};
export const PRIVATE_CONSTANTS = {};


export function initConfig(val, PATH, request, response, authService) {
    // This function is needed because these values can't be created in BaseApp,
    // since we need these appGlobals in `fetchData()` but BaseApp doesn't get
    // instantiated until `renderToString()`.
    Object.assign(CONSTANTS, val.PUBLIC);
    Object.assign(PRIVATE_CONSTANTS, val.PRIVATE);
    CONSTANTS.PATH = PATH;
    CONSTANTS.START_TS = Date.now();
    CONSTANTS.FORGOT_PASSWORD_URL = '/forgot-password';
    CONSTANTS.ADMIN_API_URL = `${CONSTANTS.API_URL.split('/v1')[0]}/admin`;
    CONSTANTS.PARTNER_API_URL = `${CONSTANTS.API_URL.split('/v1')[0]}/partner`;

    if (process.env.BROWSER) {
        const hostname = window.location.hostname;
        if (!hostname.match(/^\d+\.\d+\.\d+\.\d+(:\d+)?/) && hostname.indexOf('tenor.co') === -1) {
            // Check for tenor.co and tenor.com.
            // Prevent JS from running in Google and Bing cache views. If hosts don't
            // match, redirect should've happened on backend anyway.
            // This is defined here so that it can be reused.
            throw new Error('JS will not work in this environment, use the static HTML.');
        }
    }

    const appGlobals = {
        request,
        response,
        authService,
    };
    if (authService) {
        authService.init();
    }
    appGlobals.gtService = translation(appGlobals);
    appGlobals.gtService.addTranslations(val.locale, val.localeData);
    console.log('setLocale:', val.locale);
    appGlobals.gtService.gt.setLocale(val.locale);

    appGlobals.cacheService = getCacheService();
    appGlobals.apiService = getApiService(appGlobals);

    const store = new Store((Target, props) => {
        return <Target { ...props
        }
        />;
    });
    store.apiService = appGlobals.apiService;
    store.authService = appGlobals.authService;
    store.register('api.tags.*', TagsDataSource);
    store.register('api.gifs.featured', FeaturedGifsDataSource);
    store.register('api.gifs.byId.*', GifsDataSource);
    store.register('api.gifs.related.*', RelatedGifsDataSource);
    store.register('api.gifs.search.*', SearchDataSource);
    store.register('api.gifs.searchByUsername.*', SearchGifsByUsernameDataSource);
    store.register('api.stickers.search.*', SearchStickersDataSource);
    store.register('api.stickers.searchByUsername.*', SearchStickersByUsernameDataSource);
    store.register('api.packs.byId.*', PacksDataSource);
    store.register('api.collections.byId.*', CollectionsDataSource);
    store.register('api.exploreterms.*', ExploreTermsDataSource);
    store.register('api.searchSuggestions.*', SearchSuggestionsDataSource);
    store.register('api.profiles.*', ProfileDataSource);

    store.register('ui.GifMakerPage.*', GifMakerPageDataSource);
    store.register('ui.GifEditor.*', GifEditorDataSource);
    store.register('ui.ProfilePage.*', ProfilePageDataSource);
    store.register('ui.BrandedPartnerPage.*', ProfilePageDataSource);

    if (process.env.BROWSER) {
        const cacheEl = document.getElementById('store-cache');
        if (cacheEl && cacheEl.innerHTML.length) {
            store.set('api', JSON.parse(cacheEl.innerHTML));
        }
    }

    appGlobals.store = store;

    return appGlobals;
}