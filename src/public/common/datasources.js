import {
    DataSource
} from '../../replete';

const LIMIT = 50;

export class TagsDataSource extends DataSource {
    key([type]) {
        return type;
    }
    getInitial([type]) {
        const val = {
            pending: true,
            tags: [],
        };
        this.set([type], val);

        if (type) {
            val.promise = this.store.monitor(this.store.apiService.getV2('/categories', {
                type,
                contentfilter: 'high'
            }).then(([body, response]) => {
                body.pending = false;
                body.tags = body.tags || [];
                body.promise = Promise.resolve(body);
                this.set([type], body);
                return body;
            }, ([body, response]) => {
                body = body || val;
                body.pending = false;
                body.promise = Promise.reject(body);
                this.set([type], body);
                return body;
            }));
        }
        return val;
    }
}


export class SearchSuggestionsDataSource extends DataSource {
    key([q]) {
        return q;
    }
    getInitial([q]) {
        const val = {
            pending: true,
            results: [],
        };
        this.set([q], val);

        if (q) {
            this.store.monitor(this.store.apiService.getV2('/search_suggestions', {
                q
            }).then(([body, response]) => {
                body.pending = false;
                this.set([q], body);
                return body;
            }, ([body, response]) => {
                body = body || val;
                body.pending = false;
                this.set([q], body);
                return body;
            }));
        }
        return val;
    }
}


export class ExploreTermsDataSource extends DataSource {
    key([tag]) {
        return tag;
    }
    callApi([tag]) {
        return this.store.apiService.get('/exploreterm', {
            tag
        });
    }
    isValidKeyArgs([tag]) {
        return tag || tag === '' ? true : false;
    }
    getData(keyArgs, currentVal) {
        currentVal.pending = true;
        this.set(keyArgs, currentVal);

        return this.callApi(keyArgs).then(([body, response]) => {
            body.loaded = true;
            body.pending = false;
            body.results = body.results || [];
            this.set(keyArgs, body);
            return body;
        }, ([body, response]) => {
            body = body || currentVal;
            body.pending = false;
            body.results = [];
            body.status = response.status;
            this.set(keyArgs, body);
            return body;
        });
    }
    getInitial([tag]) {
        const val = {
            loaded: false,
            pending: true,
            results: [],
        };
        if (this.isValidKeyArgs([tag])) {
            this.store.monitor(this.getData([tag], val));
        }
        return val;
    }
}


export class GifResultsDataSource extends DataSource {
    callApi(keyArgs, pos) {
        throw new Error('callApi not defined');
    }
    isValidKeyArgs(keyArgs) {
        return keyArgs[0] ? true : false;
    }
    getData(keyArgs, currentVal) {
        const pos = currentVal.next;

        currentVal.pending = true;
        this.set(keyArgs, currentVal);

        return this.callApi(keyArgs, pos).then(([body, response]) => {
            body = this.clean(body);
            if (body.results.length === 0 || body.next === '') { // NOTE (v2 API): next = "" when no more results
                body.noMore = true;
            }
            body.loaded = true;
            body.pending = false;
            body.results = currentVal.results.concat(body.results || []);
            this.set(keyArgs, body);
            return body;
        }, ([body, response]) => {
            body = body || currentVal;
            body = this.clean(body);
            body.noMore = true;
            body.pending = false;
            body.results = [];
            this.set(keyArgs, body);
            return body;
        });
    }
    clean(val) {
        val.results = val.results || [];
        return val;
    }
    getInitial(keyArgs) {
        const val = this.clean({
            loaded: false,
            pending: true,
            noMore: false,
        });
        if (this.isValidKeyArgs(keyArgs)) {
            val.promise = this.store.monitor(this.getData(keyArgs, val));
        }
        return val;
    }
    more(keyArgs) {
        const currentVal = this.get(keyArgs);
        if (!currentVal.pending && !currentVal.noMore) {
            this.getData(keyArgs, currentVal);
        }
    }
}


export class FeaturedGifsDataSource extends GifResultsDataSource {
    isValidKeyArgs(keyArgs) {
        return true;
    }
    callApi(keyArgs, pos) {
        const query = {
            limit: LIMIT
        };
        if (pos) {
            query.pos = pos;
        }
        return this.store.apiService.getV2('/featured', query);
    }
}


export class GifsDataSource extends GifResultsDataSource {
    callApi([id]) {
        return this.store.apiService.getV2('/posts', {
            ids: id
        });
    }
    key([id]) {
        return id;
    }
}


export class RelatedGifsDataSource extends GifResultsDataSource {
    callApi([id]) {
        return this.store.apiService.getV2('/related', {
            id,
            contentfilter: 'medium'
        });
    }
    key([id]) {
        return id;
    }
}


export class PacksDataSource extends GifResultsDataSource {
    clean(val) {
        val = super.clean(val);
        val.name = val.name || '';
        return val;
    }
    callApi([id], pos) {
        return this.store.apiService.getConfig().then(([config]) => {
            if (config.enable_v2_collection) {
                const authService = this.store.authService;
                const googleAccessToken = authService.getGoogleAccessToken();

                const query = {
                    encrypted_v1_id: id,
                    limit: LIMIT,
                    access_token: googleAccessToken,
                };
                if (pos) {
                    query.pos = pos;
                }
                return this.store.apiService.getV2('/collection_posts', query);
            } else {
                const query = {
                    publicid: id,
                    limit: LIMIT,
                };
                if (pos) {
                    query.pos = pos;
                }
                return this.store.apiService.get('/pack', query);
            }
        });
    }
    key([id]) {
        const hasTenorScope = this.store.authService.hasTenorOAuthScope();
        return `${id}-${hasTenorScope}`;
    }
}


export class CollectionsDataSource extends GifResultsDataSource {
    clean(val) {
        val = super.clean(val);
        val.name = val.name || '';
        return val;
    }
    callApi([id], pos) {
        const authService = this.store.authService;
        const googleAccessToken = authService.getGoogleAccessToken();

        const query = {
            collection_id: id,
            limit: LIMIT,
            access_token: googleAccessToken,
        };
        if (pos) {
            query.pos = pos;
        }
        return this.store.apiService.getV2('/collection_posts', query);
    }
    key([id]) {
        const hasTenorScope = this.store.authService.hasTenorOAuthScope();
        console.log('hasTenorScope', hasTenorScope);
        return `${id}-${hasTenorScope}`;
    }
}


export class SearchDataSource extends GifResultsDataSource {
    callApi([q, contentfilter], pos) {
        const query = {
            q,
            limit: LIMIT,
        };
        if (contentfilter) {
            query.contentfilter = contentfilter;
        }
        if (pos) {
            query.pos = pos;
        }
        return this.store.apiService.getV2('/search', query);
    }
    key([q, contentfilter]) {
        return `${q}-${contentfilter}`;
    }
}


export class SearchStickersDataSource extends GifResultsDataSource {
    callApi([q, contentfilter], pos) {
        const query = {
            q,
            limit: LIMIT,
            searchfilter: 'sticker',
        };
        if (contentfilter) {
            query.contentfilter = contentfilter;
        }
        if (pos) {
            query.pos = pos;
        }
        return this.store.apiService.getV2('/search', query);
    }
    key([tag, contentfilter]) {
        return `${tag}-${contentfilter}`;
    }
}


export class SearchGifsByUsernameDataSource extends GifResultsDataSource {
    callApi([username, section, ownsProfile], pos) {
        let v2 = false;
        const query = {};
        let path;
        const authService = this.store.authService;
        if (section === 'favorites') {
            return this.store.apiService.getUserLikedGifs(pos);
        } else {
            if (ownsProfile) {
                query.id = authService.getId();
                query.access_token = authService.getLegacyToken();
                path = '/usersaved';
            } else {
                query.q = `@${username}`;
                query.limit = LIMIT;
                path = '/search';
                v2 = true;
            }
        }

        if (v2) {
            if (pos) {
                query.pos = pos;
            }
            return this.store.apiService.getV2(path, query);
        }
        if (pos) {
            query.pos = pos;
        }
        return this.store.apiService.get(path, query);
    }
    key([username, section, ownsProfile]) {
        return `${username}-gifs-${section}-${ownsProfile}`;
    }
}


export class SearchStickersByUsernameDataSource extends GifResultsDataSource {
    callApi([username, section, ownsProfile], pos) {
        const query = {};
        let path;
        query.searchfilter = 'sticker';

        if (ownsProfile) {
            // NOTE (v2 API): Update to v2/usersaved when endpoint becomes available
            // Currently showing search approved stickers on ownProfile (b/179955473)
            query.q = `@${username}`;
            query.limit = LIMIT;
            path = '/search';
        } else {
            query.q = `@${username}`;
            query.limit = LIMIT;
            path = '/search';
        }

        if (pos) {
            query.pos = pos;
        }
        return this.store.apiService.getV2(path, query);
    }
    key([username, section, ownsProfile]) {
        return `${username}-stickers-${section}-${ownsProfile}`;
    }
}


export class ProfileDataSource extends DataSource {
    key([username]) {
        username = username.toLowerCase();
        return `${username}-${this.store.authService.isLoggedIn()}`;
    }
    getInitial([username]) {
        username = username.toLowerCase();
        const val = {
            pending: true,
            user: {
                userid: -1,
                username: '',
            },
        };
        this.set([username], val);

        const query = {
            username
        };
        const token = this.store.authService.getLegacyToken();
        if (token) {
            query.access_token = token;
        }

        val.promise = this.store.monitor(this.store.apiService.get('/profile', query).then(([body, response]) => {
            body.pending = false;
            this.set([username], body);
            return body;
        }, ([body, response]) => {
            body = body || val;
            body.pending = false;
            this.set([username], body);
            return body;
        }));
        return val;
    }
}