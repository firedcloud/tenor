import {
    autobind
} from 'core-decorators';

import {
    Component
} from 'inferno'; // eslint-disable-line no-unused-vars
import {
    Page
} from '../../../common/components';
import {
    subscribe
} from '../../../../replete';
import {
    TaggingView
} from './views/TaggingView';
import {
    UploadView
} from './views/UploadView';
import {
    ImageViewer
} from './views/ImageViewer';
import {
    Metadata
} from '../../../common/metadata';

import {
    ITEM_STATES,
    SETTINGS
} from './constants';
import {
    createMediaFormatsList
} from './util';
import {
    getFileExtension,
    isValidFileType
} from '../../../common/util/files';
import UploadGifDataObject from './components/UploadGifDataObject';

@subscribe({
    queueIdx: ['ui.GifMakerPage.queueIdx'],
    view: ['ui.GifMakerPage.view'],
    itemPageCaptioning: ['ui.GifMakerPage.itemPageCaptioning'],
})
export class GifMakerPage extends Page {
    constructor(props, context) {
        super(props, context);
        if (this.context.featureFlags.staticImageBetaEnabled) {
            this.allowedFileTypes = SETTINGS.ALLOWED_STATIC_BETA;
        } else {
            this.allowedFileTypes = SETTINGS.ALLOWED;
        }
        this.state = this.defaultState();
        this.addItemPageCaptioningGifToQueue();
        context.store.set('ui.GifMakerPage.makerPage', this);
    }
    pageInit(props) {
        const gettextSub = this.context.gtService.gettextSub;

        this.title = gettextSub('GIF Maker | Tenor');
        this.description = gettextSub('Upload animated GIFs to Tenor to share on social media channels, text messages, and everywhere else.');
    }

    componentWillUnmount() {
        this.context.store.call('ui.GifMakerPage', 'reset');
    }

    defaultState() {
        const defaultState = {
            queue: [],
            pageErrors: [],
        };
        this.context.store.set('ui.GifMakerPage.view', this.props.itemPageCaptioning.status ? 'editing' : 'upload');
        return defaultState;
    }

    addItemPageCaptioningGifToQueue() {
        const gif = this.props.itemPageCaptioning.gif;
        if (gif) {
            const url = gif.media[0].gif.url;
            this.addItemsToQueue([url]);
        }
    }

    @autobind
    addItemsToQueue(data) {
        this.resetPageErrors();
        const maxUploads = this.maxUploads();
        this.newItemsForQueue = [];
        this.queuePromises = [];
        console.log(`FILE PICKER -- ${data.length} file(s)`, data);

        for (let i = 0;
            (i < data.length) && (i + this.state.queue.length < maxUploads); i++) {
            const datum = data[i];
            const datatype = (typeof datum === 'string' ? 'url' : 'file');
            console.log(`FILE PICKER -- FILE_${i}, name: ${datum.name}, size: ${datum.size}, type: ${datum.type}`);

            if (isValidFileType({
                    [datatype]: datum
                }, this.allowedFileTypes)) {
                this.queuePromises.push(this.addToQueuePromise({
                    [datatype]: datum
                }));
            } else {
                this.updatePageErrors({
                    type: 'filetype',
                    message: `Failed to load. Improper file type: ${getFileExtension({[datatype]: datum})}.`,
                });
            }
        }
        Promise.all(this.queuePromises).then(() => {
            const queue = this.state.queue.concat(this.newItemsForQueue);
            let view;
            if (!queue.length) {
                view = 'upload';
            } else if (this.props.itemPageCaptioning.status) {
                view = 'editing';
            } else if (!this.props.itemPageCaptioning.status && this.props.view === 'upload') {
                window.scrollTo(0, 0);
                view = 'tagging';
                this.trackEvent({
                    eventName: 'tagging_page_revealed',
                    params: {
                        'category': createMediaFormatsList({
                            queue,
                            type: 'uploadObject'
                        }),
                    },
                });
            }

            this.setState({
                queue,
                queueUpdated: true,
            });
            this.context.store.set('ui.GifMakerPage.itemPageCaptioning.gif', []);
            view && this.context.store.set('ui.GifMakerPage.view', view);
        });
    }

    removeGifFromQueue(i) {
        const queue = this.state.queue.slice(0, i).concat(this.state.queue.slice(i + 1));
        const finishedUploading = queue.every((uploadObject) => uploadObject.uploadStatus === ITEM_STATES.DONE);

        if (!queue.length) {
            this.setState({
                queue,
                queueUpdated: true,
            });
            this.context.store.set('ui.GifMakerPage.view', 'upload');
        } else if (finishedUploading) {
            this.context.router.history.push(this.linkToProfile());
        } else {
            this.setState({
                queue,
                queueUpdated: true,
            });
            this.context.store.set('ui.GifMakerPage.view', 'tagging');
        }
    }

    @autobind
    addToQueuePromise({
        url,
        file
    }) {
        const uploadObject = new UploadGifDataObject({
            url,
            file
        });

        return new Promise((resolve, reject) => {
            uploadObject.processData().then(() => {
                this.newItemsForQueue.push(uploadObject);
                resolve();
            }).catch((errorMessage) => {
                console.error(errorMessage);
                console.error(`${file ? file.name : url} failed to load`);
                this.updatePageErrors({
                    type: 'processing',
                    message: `${file ? 'file' : 'url'} failed to load`,
                });
                resolve();
            });
        });
    }

    goToProfile() {
        this.context.router.history.push(this.linkToProfile());
    }

    maxUploads() {
        const userFlags = this.context.authService.getUserFlags();
        if (userFlags.includes('admin')) {
            return 100;
        } else if (userFlags.includes('partner')) {
            return 50;
        } else {
            return 10;
        }
    }

    @autobind
    clearQueue() {
        this.setState(this.defaultState());
    }

    parsePageErrors(errorQueue) {
        if (!errorQueue.length) {
            return [];
        }
        const pageErrorMessages = [];
        let processingErrors = 0;
        let filetypeErrors = 0;
        let urlInputError = 0;
        let uploadErrors = 0;
        let otherErrors = 0;

        errorQueue.forEach((error) => {
            if (error.type === 'upload') {
                uploadErrors++;
            } else if (error.type === 'url-input') {
                urlInputError++;
            } else if (error.type === 'processing') {
                processingErrors++;
            } else if (error.type === 'filetype') {
                filetypeErrors++;
            } else {
                otherErrors++;
            }
        });

        if (uploadErrors) {
            pageErrorMessages.push(`There was an issue uploading ${uploadErrors} of your files. Please edit your upload${uploadErrors > 1 ? 's' : ''} and try again.`);
        }
        if (urlInputError) {
            pageErrorMessages.push(`Please enter a valid URL.`);
        }
        if (processingErrors) {
            pageErrorMessages.push(`There was an issue processing ${processingErrors} of your files.`);
        }
        if (filetypeErrors) {
            const multipleFiles = filetypeErrors > 1;
            let msg;
            if (this.context.featureFlags.staticImageBetaEnabled) {
                if (multipleFiles) {
                    msg = 'they are not GIFs, MP4s, PNGs, or JPEGs';
                } else {
                    msg = 'it is not a GIF, MP4, PNG or JPEG';
                }
            } else {
                if (multipleFiles) {
                    msg = 'they are not GIFs or MP4s';
                } else {
                    msg = 'it is not a GIF or MP4';
                }
            }
            pageErrorMessages.push(`${filetypeErrors} of your uploads could not be processed since ${msg}.`);
        }
        if (otherErrors) {
            pageErrorMessages.push(`Unknown Error: Please try again.`);
        }

        return pageErrorMessages;
    }
    updatePageErrors(error) {
        const pageErrors = this.state.pageErrors.concat(error);
        this.resetPageErrors(pageErrors);
    }
    resetPageErrors(pageErrors = []) {
        this.setState({
            pageErrors,
            pageErrorsUpdated: true,
        });
    }

    trackEvent({
        eventName,
        params = {},
        gaParams = {}
    }) {
        // NOTE convert array/hash to underscore separated string
        for (const property in params) {
            if (Object.prototype.hasOwnProperty.call(params, property)) {
                let obj = params[property];
                if (obj && typeof obj === 'object') {
                    if (!Array.isArray(obj)) {
                        obj = Object.keys(obj);
                    }
                    params[property] = obj.join('_');
                }
            }
        }

        if (params.hasOwnProperty('info')) {
            if (params['info'] === null || params['info'] === undefined) {
                delete params['info'];
            }
        }

        gaParams['eventCategory'] = 'GifMaker';
        gaParams['eventAction'] = eventName;
        if (!gaParams.hasOwnProperty('eventValue') && params.hasOwnProperty('viewindex')) {
            gaParams['eventValue'] = params['viewindex'];
        }
        if (!gaParams.hasOwnProperty('eventLabel')) {
            if (params.hasOwnProperty('actions')) {
                gaParams['eventLabel'] = params['actions'];
            } else if (params.hasOwnProperty('category')) {
                gaParams['eventLabel'] = params['category'];
            }
        }

        // console.log(`******TRACKING DATA`, eventName, params);
        // console.log(`******GA TRACKING DATA`, gaParams);
        this.context.apiService.registerEventLegacy(eventName, params);
        window.ga('send', 'event', gaParams);
    }

    renderPage() {
            return ( <
                    div className = "GifMakerPage" >
                    <
                    Metadata page = {
                        this
                    }
                    /> {
                        this.props.view === 'upload' &&
                            <
                            UploadView
                        queue = {
                            this.state.queue
                        }
                        queueUpdated = {
                            this.state.queueUpdated
                        }
                        pageErrors = {
                            this.state.pageErrors
                        }
                        pageErrorsUpdated = {
                            this.state.pageErrorsUpdated
                        }
                        />} {
                            this.props.view === 'tagging' &&
                                <
                                TaggingView
                            queue = {
                                this.state.queue
                            }
                            queueUpdated = {
                                this.state.queueUpdated
                            }
                            pageErrors = {
                                this.state.pageErrors
                            }
                            pageErrorsUpdated = {
                                this.state.pageErrorsUpdated
                            }
                            />} {
                                (this.props.view === 'imageViewer' || this.props.view === 'editing') &&
                                <
                                ImageViewer
                                queue = {
                                    this.state.queue
                                }
                                />} <
                                /div>
                            );
                        }
                    }