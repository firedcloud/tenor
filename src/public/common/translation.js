/*

mark strings
extract strings
load translations

bundle language inside JS file?
path lang prefixes
mark url paths
get translated paths in sitemaps/api?

make related tags responsive:
https://tenor.com/search/movies-gifs
*/

import format from 'string-format';
import Gettext from 'node-gettext';

import {
    removeEmptyStrings
} from './util';
import rootScope from '../mainapp/services/rootScope';


export const domain = 'messages';


export default function(appGlobals) {
    const locales = [];

    const gt = new Gettext();


    function gettextSub(msg, kwargs) {
        let s = gt.gettext(msg);
        if (kwargs) {
            s = format(s, kwargs);
        }
        return s;
    }


    function gettextSubComponent(msg, kwargs) {
        /*
        Used when JSX components are contained within text blocks in need of translation.
        */
        let s = gt.gettext(msg);
        const vals = [];
        const l = [];

        s = s.replace(/\{(\w+)\}/g, function(m, p1) {
            if (kwargs[p1]) {
                vals.push(kwargs[p1]);
                return `{placeholder}`;
            }
            return m;
        }).split('{placeholder}');

        for (let i = 0; i < s.length; i++) {
            l.push(s[i]);
            if (i < vals.length) {
                l.push(vals[i]);
            }
        }

        return l;
    }


    let localizedPaths = {};
    let localizedPathsRev = {};


    function setLocalizedPaths(newMapping) {
        localizedPaths = newMapping;
        localizedPathsRev = {};
        for (const [key, val] of Object.entries(newMapping)) {
            localizedPathsRev[val] = key;
        }
        // console.log('localizedPaths', gt.locale, localizedPaths);
    }


    function localizeUrlPath(path) {
        if (gt.locale && gt.locale !== 'en') {
            path = `/${gt.locale}${path}`;
            // console.log('localizeUrlPath1', path);
            path = path.replace(/(\/[^/]+\/)([^/]+)/, function(m, p1, p2) {
                return `${p1}${localizedPaths[p2] || ''}`;
            });
            // console.log('localizeUrlPath2', path);
            return path;
        }

        return path;
    }


    function delocalizeUrlPath(path) {
        if (gt.locale && gt.locale !== 'en') {
            // Presumes locale in path is current locale.
            return path.replace(/\/([^/]+)/, '').replace(/\/([^/]+)/, function(m, p1) {
                return `/${localizedPathsRev[p1]}`;
            });
        }

        return path;
    }


    function addTranslations(locale, parsedTranslations) {
        locales.push(locale);
        gt.addTranslations(locale, domain, parsedTranslations);
    }

    function parseURLSearchTags(s, checkPath) {
        const searchPath = localizeUrlPath('/search/');
        if (checkPath && s.substr(0, searchPath.length) !== searchPath) {
            return [];
        }
        s = s.replace(searchPath, '').replace(rootScope.searchEndRegEx, '').split(rootScope.searchURLSep);
        return removeEmptyStrings(s);
    }

    function parseURLSearchMediaType(s) {
        if (s.match(`${rootScope.searchEndStickers}$`)) {
            return 'stickers';
        } else {
            return 'gifs';
        }
    }

    return {
        locales,
        gt,
        gettextSub,
        gettextSubComponent,
        setLocalizedPaths,
        localizeUrlPath,
        delocalizeUrlPath,
        addTranslations,
        parseURLSearchTags,
        parseURLSearchMediaType,
    };
}