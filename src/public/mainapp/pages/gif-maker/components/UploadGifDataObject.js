import {
    ITEM_STATES,
    FILE_TYPES
} from '../constants';
import parseGif from '../GifEditor/parseGif';
import parseVideo from '../GifEditor/parseVideo';
import encodeGif from '../GifEditor/encodeGif';
import {
    autobind
} from 'core-decorators';
import {
    iOS,
    isChrome
} from '../../../../common/util/isMobile';
import {
    getFileExtension,
    getFilename
} from '../../../../common/util/files';

// FIXME: make sure delay is correct and all frames are included, generated GIFs
// are just slightly shorter than the original.

// This constant is used for fixing bad frame delays, typically when delay is 0.
// Used to overwrite the bad value, as we don't want to keep it down the pipeline.
const MIN_FRAME_DELAY_MS_FIX = 100;

export default class UploadGifDataObject {
    constructor({
        url,
        file
    }) {
        this.rawData = {
            file: file,
            url: url,
            mediaType: getFileExtension({
                url,
                file
            }),
        };
        this.filename = getFilename({
            url,
            file
        });

        this.videoData = null;
        this.gifData = null;
        this.originalGifData = null;
        this.editedGifData = null;

        this.mediaType = null; // ('gif'|'mp4'|'jpeg'|'png')
        this.uploadFormat = null; // ('gif'|'mp4'|'jpeg'|'png'|'url')

        this.editorSettings = null;
        this.editorStatus = null;
        this.editorToolsUsageTrackingList = [];

        this.tags = [];
        this.tagsExpanded = false;
        this.uploadErrorMessage = null;
        this.uploadStatus = ITEM_STATES.PENDING;
        this._trackingId = this.generateRandomString();
    }

    get trackingId() {
        return this._trackingId;
    }

    getOriginalMediaType() {
        return this.rawData.mediaType;
    }

    /**
     * @return {Promise<array>} Promise resolves with frames
     */
    parseVideoFrames() {
        /*
            There are 3 settings that can be changed to improve performance:
            1) Downsizing large videos leads to better performance/playback in
            the editor and smaller file sizes.
            2) Increasing the sample rate speeds up parsing but increases chopiness.
            3) Processing multiple concurrent video elements speeds up parsing but
            currently only works only on Chrome (not Safari). Android Chrome sees
            the greatest impact to parsing time (~60% improvement).
            NB: Chrome on iOS is just a skin of Safari, and does not see an
            improvement to parsing with multiple video elements.
        */

        const settings = {
            videoMaxWidth: 500,
            videoSampleRate: 100,
            numVideoElements: isChrome() && !iOS() ? 10 : 1,
        };

        return new Promise((resolve, reject) => {
            parseVideo(this.videoData.file, settings).then((frames) => {
                this.dims = [frames[0].dims.width, frames[0].dims.height];
                this.videoData.dims = [frames[0].dims.width, frames[0].dims.height];
                this.frames = frames;
                resolve(frames);
            });
        });
    }

    /**
     * @return {Promise<array>} Promise resolves with frames
     */
    @autobind
    parseGifFrames() {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.addEventListener('loadend', () => {
                const arrayBuffer = reader.result;
                // TODO: alert user if window.WebAssembly isn't supported
                // TODO: alert user to errors
                parseGif(arrayBuffer).then((frames) => {
                    frames.forEach(function(frame, idx) {
                        frame.dims = {
                            width: frame.imageData.width,
                            height: frame.imageData.height,
                        };
                        if (!frame.delay) {
                            frame.delay = MIN_FRAME_DELAY_MS_FIX;
                        }
                        if (idx > 0) {
                            const prevFrame = frames[idx - 1];
                            frame.start = prevFrame.start + prevFrame.delay;
                        } else {
                            frame.start = 0;
                        }
                        frame.end = frame.start + frame.delay;
                    });
                    this.frames = frames;
                    resolve(frames);
                });
            }, false);
            reader.readAsArrayBuffer(this.gifData.file);
        });
    }

    /**
     * @return {Promise<array>} Promise resolves with frames
     */
    getFrames() {
        if (this.frames) {
            return Promise.resolve(this.frames);
        } else if (this.isGifUpload()) {
            return this.parseGifFrames();
        } else if (this.onlyHasVideoData()) {
            return this.parseVideoFrames();
        } else if (this.isUrlUpload()) {
            return this.fetchGifFromUrl().then(this.parseGifFrames);
        } else {
            return Promise.reject(new Error('failed to load gif frames'));
        }
    }

    /**
     * @return {Promise} Promise resolves with gifData
     */
    @autobind
    convertVideoToGif() {
        if (this.frames) {
            return this.createGifFromFrames(null, null);
        } else {
            return this.parseVideoFrames().then(this.convertVideoToGif);
        }
    }

    /**
     * @return {Promise} Promise resolves with gifData
     */
    createGifFromFrames(editor, editorSettings) {
        this.editorStatus = 0;
        const frames = this.frames;
        let startFrameIdx = 0;
        let endFrameIdx = this.frames.length - 1;

        if (editorSettings) {
            this.editorSettings = editorSettings;
            startFrameIdx = editorSettings.trimData.startFrameIdx;
            endFrameIdx = editorSettings.trimData.endFrameIdx;
        }

        const progressCB = editor ? editor.updateProgress : (val) => {
            // TODO track progress?
        };

        return encodeGif(frames, startFrameIdx, endFrameIdx, editor, progressCB)
            .then((gif) => {
                console.log(`FILE UPLOAD SIZE: ${(gif.file.size / 1000000).toFixed(2)} MB`);
                return this.processData({
                    file: gif.file
                });
            });
    }

    /**
     * @return {Promise}
     */
    fetchGifFromUrl() {
        return new Promise((resolve, reject) => {
            let url = this.gifData.url;
            // load media and media1 URLs directly, allows browser to reuse assets.
            if (!/^https:\/\/media1?\.tenor\.com/.test(url)) {
                url = `/gif-loader?${new URLSearchParams({url})}`;
            }
            const options = {
                method: 'GET',
                mode: 'cors',
                cache: 'default',
            };
            const request = new Request(url);
            return fetch(request, options).then((response) => {
                    response.blob().then((blob) => {
                        this.gifData.file = blob;
                        this.gifData.objectUrl = window.URL.createObjectURL(blob);
                        resolve();
                    });
                },
                (error) => {
                    console.error('image load error: ', error);
                    reject();
                });
        });
    }

    /**
     * @return {Promise} Promise resolves with objectUrl
     */
    getObjectUrl() {
        return new Promise((resolve, reject) => {
            if (this.gifData && this.gifData.objectUrl) {
                resolve(this.gifData.objectUrl);
            } else if (this.onlyHasVideoData()) {
                this.convertVideoToGif().then(() => {
                    resolve(this.gifData.objectUrl);
                });
            } else if (this.isUrlUpload()) {
                this.fetchGifFromUrl().then(() => {
                    resolve(this.gifData.objectUrl);
                });
            }
        });
    }

    saveToolsUsageTracking(dataObj) {
        this.editorToolsUsageTrackingList = Object.keys(dataObj);
    }

    isFileUpload() {
        return FILE_TYPES.FILES.includes(this.uploadFormat);
    }
    isGifUpload() {
        return this.uploadFormat === FILE_TYPES.GIF;
    }
    isVideoUpload() {
        return this.uploadFormat === FILE_TYPES.MP4;
    }
    isStaticImageUpload() {
        return FILE_TYPES.STATIC_IMAGES.includes(this.uploadFormat);
    }
    isUrlUpload() {
        return this.uploadFormat === FILE_TYPES.URL;
    }

    hasGifData() {
        return !!this.gifData;
    }
    onlyHasVideoData() {
        return this.videoData && !this.gifData;
    }

    switchToOriginalGifData() {
        if (this.originalGifData) {
            this.gifData = this.originalGifData;
        }
    }

    gifHasBeenEdited() {
        return this.editedGifData !== null;
    }

    switchToEditedGifData() {
        if (this.gifHasBeenEdited()) {
            this.gifData = this.editedGifData;
        }
    }

    // generate alphanumeric string (0-9, a-z) approximately 11 characters in length
    generateRandomString() {
        const random = Math.random().toString(36);
        return random.replace(/0\./g, '');
    }

    /*
        TODO need to figure out when/where to revoke ObjectURL. On all uploads
        completed? I believe it is used on the profile page while waiting for
        the gif to process though.
        NB: "If you pass a File selected by the user from an <input type=file>, then the blobURI you created is a direct pointer to the file on the user's disk, nothing apart this mapping URI-file_path is saved in memory. So in this case, you can create a lot of these without ever revoking it with no real risk."
        https://stackoverflow.com/a/49346614/11199059
    */
    // revokeURL() {
    //     window.URL.revokeObjectURL(this.gifData.objectUrl);
    // }


    /**
     * @return {Promise} Promise resolves with gifData
     */
    loadImageFromRawGifData(gifData) {
        return new Promise((resolve, reject) => {
            gifData.image = new Image();
            gifData.image.onload = () => {
                resolve(gifData);
            };
            gifData.image.onerror = () => {
                reject('IMG FAILED TO LOAD');
            };
            if (gifData.file) {
                gifData.objectUrl = window.URL.createObjectURL(gifData.file);
                gifData.image.src = gifData.objectUrl;
            } else if (gifData.url) {
                gifData.image.src = gifData.url;
            }
        });
    }

    /**
     * @return {Promise} Promise resolves with videoData
     */
    loadVideoFromRawVideoData(videoData) {
        return new Promise((resolve, reject) => {
            videoData.video = document.createElement('video');
            videoData.video.onloadedmetadata = () => {
                resolve(videoData);
            };
            videoData.video.onerror = () => {
                reject('VIDEO FAILED TO LOAD');
            };
            videoData.objectUrl = window.URL.createObjectURL(videoData.file);
            videoData.video.src = videoData.objectUrl;
        });
    }

    getFileUploadData() {
        const name = this.filename;
        let file;
        if (this.isVideoUpload()) {
            file = this.videoData.file;
        } else if (this.isGifUpload() || this.isStaticImageUpload()) {
            file = this.gifData.file;
        } else {
            return null;
        }
        return {
            file,
            name
        };
    }

    getUploadUrl() {
        return this.rawData.url;
    }

    getDims() {
        return [this.dims[0], this.dims[1]];
    }

    /**
     * Process the url/file data from staging or encoding.
     * @return {Promise} Promise resolves with videoData/gifData
     */
    @autobind
    processData(data) {
        data = data || {
            url: this.rawData.url,
            file: this.rawData.file
        };
        const {
            file,
            url
        } = data;

        this.mediaType = getFileExtension({
            file,
            url
        });
        this.uploadFormat = (url ? FILE_TYPES.URL : this.mediaType);

        if (this.mediaType === FILE_TYPES.MP4) {
            return this.loadVideoFromRawVideoData(data).then((videoData) => {
                // TODO add videoData handling to uploadService?
                const width = videoData.video.videoWidth;
                const height = videoData.video.videoHeight;
                this.dims = this.dims || [width, height];
                videoData.dims = [width, height];
                this.videoData = videoData;
                return videoData;
            });
        } else if (this.mediaType === FILE_TYPES.GIF || FILE_TYPES.STATIC_IMAGES.includes(this.mediaType)) {
            return this.loadImageFromRawGifData(data).then((gifData) => {
                gifData.gif = {
                    tags: [],
                    long_title: '',
                    bg_color: '#3f3f3f',
                    unprocessed: true,
                };
                const width = gifData.image.naturalWidth;
                const height = gifData.image.naturalHeight;
                this.dims = this.dims || [width, height];
                gifData.dims = [width, height];

                // Needed for mathService
                gifData.gif.media = [{
                    nanogif: {
                        dims: [width, height],
                        url: gifData.image.src,
                    },
                    tinygif: {
                        dims: [width, height],
                        url: gifData.image.src,
                    },
                    mediumgif: {
                        dims: [width, height],
                        url: gifData.image.src,
                    },
                    gif: {
                        dims: [width, height],
                        url: gifData.image.src,
                    },
                }, ];
                if (this.editorSettings) {
                    this.editorStatus = null;
                    this.editedGifData = gifData;
                }
                if (!this.originalGifData) {
                    this.originalGifData = gifData;
                }
                this.gifData = gifData;
                return gifData;
            });
        } else {
            return Promise.reject(new Error(`unsupported data type ${this.mediaType}`));
        }
    }
}