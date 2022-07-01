import {
    autobind
} from 'core-decorators';

import {
    Component
} from 'inferno'; // eslint-disable-line no-unused-vars

import {
    BaseSearchBar
} from '../../common/components/BaseSearchBar';
import {
    localURL,
    window
} from '../../common/util';

import './SearchBar.scss';


export class SearchBar extends BaseSearchBar {
    constructor(props, context) {
        super(props, context);

        const gettextSub = this.context.gtService.gettextSub;

        this.placeholder = gettextSub('Search for GIFs and Stickers');
    }
    stringToPath(s) {
        const localizeUrlPath = this.context.gtService.localizeUrlPath;

        return localizeUrlPath(this.linkToSearch(s.trim()));
    }
    pathToString(path) {
        const delocalizeUrlPath = this.context.gtService.delocalizeUrlPath;

        let s = '';
        path = delocalizeUrlPath(path);
        if (path.substr(0, 8) === '/search/') {
            s = path.substr(8).replace(/(?:-gifs|-stickers)$/g, '').replace(/-/g, ' ');
        }
        return s;
    }
    fetchSuggestions(reqValue) {
        let autocompleteResults;
        let partnerAutocompleteResults;

        const p1 = this.context.apiService.getAutocompleteResults(reqValue)
            .then(([body, response]) => {
                autocompleteResults = body;
            });
        const p2 = this.context.apiService.getAutocompleteResults(reqValue, 'partner')
            .then(([body, response]) => {
                partnerAutocompleteResults = body;
            });
        return Promise.all([p1, p2])
            .then(() => {
                if (reqValue === this.state.value.name.trim()) {
                    const suggestions = [];
                    let item;
                    for (item of (partnerAutocompleteResults.results || [])) {
                        const {
                            partnername,
                            url,
                            avatars,
                            flags
                        } = item.user;
                        suggestions.push({
                            name: partnername,
                            path: localURL(url),
                            image: avatars['32'],
                            userflags: flags,
                        });
                    }
                    for (item of (autocompleteResults.results || [])) {
                        suggestions.push(this.stringToValue(item));
                    }
                    this.setSuggestions(suggestions);
                }
            });
    }
    @autobind
    handleSearchPerformed(val) {
        window.fbq('track', 'Search', {
            search_string: val
        });
    }
}