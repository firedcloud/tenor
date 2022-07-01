import storageService from './storageService';
import {
    getV1PostId
} from '../../common/util';

function createPromiseOrReturn(body, sync) {
    if (sync) {
        return body;
    }
    return Promise.resolve([body, null]);
}

export function getCacheService() {
    function storedFavorites() {
        const storedFavoritesItem = storageService.getItem('userFavorites');
        if (storedFavoritesItem) {
            return JSON.parse(storedFavoritesItem);
        } else {
            return false;
        }
    }

    const internalCache = {};

    function privateCacheInit() {
        internalCache['gif-img-sizes'] = {};
        internalCache['gifs'] = internalCache['gifs'] || {};
        internalCache['autocomplete'] = internalCache['autocomplete'] || {};
        internalCache['userFavorites'] = storedFavorites() || {};
    }
    privateCacheInit();

    const ret = {
        getGif: function(id, sync) {
            const val = internalCache['gifs'][id];
            if (val) {
                return createPromiseOrReturn(val, sync);
            }

            return null;
        },
        setGif: function(id, data) {
            internalCache['gifs'][id] = data;
        },

        /* Favoriting Methods*/
        isFavorite: function(gif) {
            const pid = getV1PostId(gif);
            if (internalCache['userFavorites']) {
                return internalCache['userFavorites'][pid] !== undefined || internalCache['userFavorites'][gif.id] !== undefined;
            } else {
                return false;
            }
        },
        getFavorites: function() {
            return internalCache['userFavorites'];
        },
        getFavoriteCopiedPostId: function(pid) {
            const gif = internalCache['userFavorites'][pid];
            if (gif && gif.copied_post_pid && gif.copied_post_pid !== '0') {
                return gif.copied_post_pid;
            }
            return null;
        },
        updateFavorites: function(pids, remove) {
            pids = (Array.isArray(pids) ? pids : [pids]);

            pids.forEach((pid, i) => {
                if (remove) {
                    delete internalCache['userFavorites'][pid];
                } else {
                    internalCache['userFavorites'][pid] = true;
                }
            });
            storageService.setItem('userFavorites', JSON.stringify(internalCache['userFavorites']));
        },
        setFavorites: function(favList) {
            internalCache['userFavorites'] = favList;
            storageService.setItem('userFavorites', JSON.stringify(internalCache['userFavorites']));
        },
        clearFavorites: function() {
            internalCache['userFavorites'] = {};
            storageService.removeItem('userFavorites');
        },

        getAutocompleteResults: function(tag, type, sync) {
            const val = internalCache['autocomplete'][`${type}-${tag}`];
            if (val) {
                return createPromiseOrReturn(val, sync);
            }

            return null;
        },
        setAutocompleteResults: function(tag, type, data) {
            internalCache['autocomplete'][`${type}-${tag}`] = data;
        },
    };
    return ret;
}