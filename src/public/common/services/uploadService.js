import emitter from 'tiny-emitter/instance';

import storageService from './storageService';
import clone from 'clone';

const emptyGif = {
    'tags': [],
    'long_title': '',
    'bg_color': '#3f3f3f',
    'unprocessed': true,
    'media': [{
        'nanogif': {
            'dims': [200, 200],
            'url': ''
        },
        'tinygif': {
            'dims': [200, 200],
            'url': ''
        },
        'mediumgif': {
            'dims': [200, 200],
            'url': ''
        },
        'gif': {
            'dims': [200, 200],
            'url': ''
        },
    }, ],
};

const ret = {
    unprocessedUploads: {},
    processedUploads: {},
    fetchingInProgress: false,
    unprocessedUploadsExist: () => {
        return Object.keys(ret.unprocessedUploads).length > 0;
    },
    fetchUnprocessed: (apiService) => {
        ret.fetchingInProgress = true;
        if (ret.unprocessedUploadsExist()) {
            const ids = Object.keys(ret.unprocessedUploads);
            apiService.getGifV1(ids, 'fetchingUnprocessed').then(([body]) => {
                if (body.results) {
                    body.results.forEach((gifData) => {
                        if (gifData.media) {
                            const gif = ret.unprocessedUploads[gifData.id];
                            if (gif) {
                                gif.unprocessed = false;
                                for (const key of Object.keys(gifData)) {
                                    gif[key] = gifData[key];
                                }
                                ret.processUpload(gif.id);
                                emitter.emit('uploads-processed');
                            }
                        }
                    });
                }
            }).then(() => {
                if (ret.unprocessedUploadsExist()) {
                    setTimeout(() => {
                        return ret.fetchUnprocessed(apiService);
                    }, 10000);
                } else {
                    ret.fetchingInProgress = false;
                    return;
                }
            });
        } else {
            ret.fetchingInProgress = false;
            return;
        }
    },
    processUpload: (id) => {
        const processedGif = clone(ret.unprocessedUploads[id]);
        delete ret.unprocessedUploads[id];
        ret.processedUploads[id] = processedGif;
        storageService.setItem(
            'unprocessedUploads',
            JSON.stringify(ret.unprocessedUploads)
        );
    },
    removeUnprocessedUpload: (id) => {
        delete ret.unprocessedUploads[id];
        storageService.setItem(
            'unprocessedUploads',
            JSON.stringify(ret.unprocessedUploads)
        );
    },
    removeProcessedUpload: (id) => {
        delete ret.processedUploads[id];
    },
    clearProcessed: () => {
        ret.processedUploads = {};
    },
    clearAll: () => {
        ret.processedUploads = {};
        ret.unprocessedUploads = {};
        storageService.setItem(
            'unprocessedUploads',
            JSON.stringify(ret.unprocessedUploads)
        );
    },
    addUnprocessedUpload: (id, gif) => {
        let newGif = Object.assign(clone(emptyGif), clone(gif));
        newGif = ret.cleanGif(newGif);
        ret.unprocessedUploads[id] = newGif;
        try {
            ret.storeUnprocessedUpload();
        } catch (err) {
            console.log('File size exceeds local storage limit');
            ret.unprocessedUploads[id] = clone(emptyGif);
            ret.storeUnprocessedUpload();
        }
    },
    storeUnprocessedUpload: () => {
        storageService.setItem(
            'unprocessedUploads',
            JSON.stringify(ret.unprocessedUploads)
        );
    },
    cleanGif: (gif) => {
        // delete unused media to reduce file size
        if (gif.media && gif.media.length) {
            delete gif.media[0].nanogif;
            // delete gif.media[0].tinygif;
            delete gif.media[0].mediumgif;
            delete gif.media[0].gif;
            delete gif.media[0].tinymp4;
            delete gif.media[0].nanowebm;
            delete gif.media[0].tinywebm;
        }
        gif.unprocessed = true;
        return gif;
    },
};

if (storageService.getItem('unprocessedUploads')) {
    ret.unprocessedUploads = JSON.parse(storageService.getItem('unprocessedUploads'));
}

export default ret;