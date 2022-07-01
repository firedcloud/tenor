import {
    autobind
} from 'core-decorators';
import {
    Component
} from 'inferno'; // eslint-disable-line no-unused-vars

import {
    CustomComponent
} from '../../../../common/components';
import {
    Icon
} from '../../../../common/components/Icon';
import {
    NavigationPrompt
} from '../../../../common/components/NavigationPrompt';
import {
    ProgressCircle,
    ProgressCircleIndeterminate
} from '../../../../common/components/ProgressCircle';
import dialog from '../../../../common/dialog';
import authService from '../../../../common/services/authService';
import uploadService from '../../../../common/services/uploadService';
import {
    window
} from '../../../../common/util';

import {
    TagSearchBox
} from '../components/TagSearchBox';
import {
    UploadDropZone
} from '../components/UploadDropZone';
import {
    ITEM_STATES
} from '../constants';
import {
    createMediaFormatsList
} from '../util';

import {
    subscribe
} from '../../../../../replete';

import './TaggingView.scss';

export const TAG_COLORS = [
    '#8BB3A6',
    '#8BB398',
    '#8BB38B',
    '#98B38B',
    '#A6B38B',
    '#B3B38B',
    '#B3A68B',
    '#B38B98',
    '#B38B8B',
    '#B38BA6',
    '#B38BB3',
    '#A68BB3',
    '#988BB3',
    '#8B8BB3',
    '#8B98B3',
    '#8BA6B3',
    '#8BB3B3',
];

@subscribe({
    isMobile: ['ui.isMobile'],
    makerPage: ['ui.GifMakerPage.makerPage'],
    itemPageCaptioning: ['ui.GifMakerPage.itemPageCaptioning'],
})
export class TaggingView extends CustomComponent {
    constructor(props, context) {
        super(props, context);
        this.state = {
            queue: props.queue || [],
            pageErrorMessages: this.parsePageErrors(),
            uploadProgress: [],
            pageUploadStatus: ITEM_STATES.PENDING,
            firstUploadAttempt: true,
        };
    }

    componentDidUpdate(prevProps) {
        if (this.props.queueUpdated) {
            this.setState({
                queue: this.props.queue,
            });
            this.props.makerPage.setState({
                queueUpdated: false
            });
        }
        if (this.props.pageErrorsUpdated) {
            this.setState({
                pageErrorMessages: this.parsePageErrors(),
            });
            this.props.makerPage.setState({
                pageErrorsUpdated: false
            });
        }
    }

    @autobind
    parsePageErrors() {
        return this.props.makerPage.parsePageErrors(this.props.pageErrors);
    }
    @autobind
    resetPageErrorsIfNoQueueItemErrors() {
        const noItemFailures = this.state.queue.every((uploadObject) => {
            return uploadObject.uploadStatus !== ITEM_STATES.FAILURE;
        });
        if (noItemFailures) {
            this.props.makerPage.resetPageErrors();
        }
    }

    @autobind
    openImageViewerDialog(i, editing) {
        return () => {
            this.context.store.set('ui.GifMakerPage.queueIdx', i);
            if (editing) {
                this.context.store.set('ui.GifMakerPage.view', 'editing');
                this.props.makerPage.trackEvent({
                    eventName: 'edit_tapped',
                    params: {
                        'category': this.props.queue[i].getOriginalMediaType(),
                    },
                });
            } else {
                this.context.store.set('ui.GifMakerPage.view', 'imageViewer');
            }
        };
    }

    uploadDisabled() {
        const gifEditingInProgress = this.props.queue.some((uploadObject) => {
            const progress = uploadObject.editorStatus;
            return progress !== null;
        });
        const failedUploadsNeedChanges = this.props.queue.some((uploadObject) => {
            return uploadObject.uploadStatus === ITEM_STATES.FAILURE;
        });
        const missingTags = this.props.queue.some((uploadObject) => {
            return uploadObject.tags.length === 0;
        });
        const uploadInProgress = (this.state.pageUploadStatus === ITEM_STATES.INPROGRESS);

        return (
            gifEditingInProgress || missingTags || uploadInProgress || failedUploadsNeedChanges
        );
    }

    @autobind
    handleRemoveButton(i) {
        return () => {
            dialog.open('confirmation-dialog', {
                confirmCallback: this.removeUploadItem(i),
                header: this.context.gtService.gettextSub(`Delete?`),
                message: this.context.gtService.gettextSub(`This upload and its associated tags will not be uploaded.`),
            });
        };
    }

    @autobind
    handleStaticImageInfoButton() {
        return () => {
            dialog.open('confirmation-dialog', {
                header: this.context.gtService.gettextSub(`JPEG and PNG Files`),
                message: this.context.gtService.gettextSub(`We plan to add these uploads to search results in the future.`),
                confirmButtonText: this.context.gtService.gettextSub(`OKAY`),
                options: {
                    hideDenyButton: true,
                },
            });
        };
    }

    @autobind
    removeUploadItem(i) {
        return () => {
            this.props.makerPage.trackEvent({
                eventName: 'tagging_page_content_removed',
                params: {
                    'category': this.props.queue[i].getOriginalMediaType(),
                },
            });
            this.resetPageErrorsIfNoQueueItemErrors();
            this.props.makerPage.removeGifFromQueue(i);
        };
    }

    formatTagString(tag) {
        const formattedTag = tag.replace(/[A-Z]/g, (v) => {
            return ` ${v}`;
        }).trim();
        return formattedTag;
    }

    @autobind
    removeTag(tag, uploadObject) {
        return () => {
            this.setTag('remove', tag, uploadObject);
        };
    }

    @autobind
    addTag(tag, uploadObject) {
        this.setTag('add', tag, uploadObject);
    }

    @autobind
    setTag(action, tag, uploadObject) {
        const applyToAll = !uploadObject;
        let numGifsTagAppliedTo = 0;

        for (let idx = 0; idx < this.props.queue.length; idx++) {
            const queueItem = this.props.queue[idx];

            // Don't apply tags to already uploaded gifs
            if (queueItem.uploadStatus === ITEM_STATES.DONE) {
                continue;
            }
            // Don't apply tags to gifs that are being waiting to be uploaded
            if (queueItem.uploadStatus === ITEM_STATES.INPROGRESS) {
                break; // will ensure pending uploads are not affected too
            }
            // Don't apply tags to all unless "Add to all" button selected
            if (!applyToAll && uploadObject !== queueItem) {
                continue;
            }

            if (queueItem.uploadStatus === ITEM_STATES.FAILURE) {
                queueItem.uploadStatus = ITEM_STATES.PENDING;
            }

            const tags = queueItem.tags.slice();

            // clear item error
            queueItem.uploadErrorMessage = null;

            if (action === 'add' && !tags.includes(tag)) {
                queueItem.tags = tags.concat([tag]);
                numGifsTagAppliedTo++;
            }

            if (action === 'remove') {
                const index = tags.indexOf(tag);
                if (index > -1) {
                    tags.splice(index, 1);
                    queueItem.tags = tags;
                    this.triggerUpdate();
                }
            }
        }

        if (applyToAll) {
            this.props.makerPage.trackEvent({
                eventName: 'add_to_all_tap',
                params: {
                    'viewindex': numGifsTagAppliedTo
                },
            });
        }

        this.resetPageErrorsIfNoQueueItemErrors();
        this.triggerUpdate();
    }

    // NOTE: register upload event twice, after user 1) clicks upload 2) receives postid
    registerUserUploadEvent(eventName, uploadObject, id) {
        let params;

        if (id) {
            const trackingId = uploadObject.trackingId;
            params = {
                'embedid': trackingId,
                'riffid': id,
            };
        } else {
            const trackingId = uploadObject.trackingId;
            params = {
                'embedid': trackingId,
            };
        }

        const fileType = uploadObject.isUrlUpload() ? 'url' : 'file';
        const originalMediaType = uploadObject.getOriginalMediaType();
        const uploadFormat = `${fileType}_${originalMediaType}`;

        params.category = uploadFormat;
        params.actions = uploadObject.editorToolsUsageTrackingList;

        this.props.makerPage.trackEvent({
            eventName,
            params,
            gaParams: {
                'eventLabel': uploadFormat
            },
        });
    }

    @autobind
    startUpload(event) {
        event && event.preventDefault();
        const uploadDisabled = this.uploadDisabled();
        const gettextSub = this.context.gtService.gettextSub;
        const userId = authService.getId();
        let i = 0;
        let numUploadsSuccessful = 0;
        let numUploadsFailed = 0;
        const editorToolsUsageTracking = {};
        const pageErrors = [];
        const numUploadsAttempting = this.state.queue.filter((uploadObject) => {
            return uploadObject.uploadStatus === ITEM_STATES.PENDING;
        }).length;

        const eventTrackingParams = {
            'viewindex': numUploadsAttempting,
        };
        if (uploadDisabled) {
            eventTrackingParams.info = 'disabled';
        }

        if (this.state.firstUploadAttempt) {
            this.props.makerPage.trackEvent({
                eventName: 'upload_start_tap',
                params: eventTrackingParams,
            });
        } else {
            this.props.makerPage.trackEvent({
                eventName: 'upload_start_tap_retry',
                params: eventTrackingParams,
            });
        }

        if (uploadDisabled) {
            return;
        }

        if (!authService.isLoggedIn()) {
            authService.showLoginDialog({
                'forceLogInToUpload': true,
                'loggedinCallback': this.startUpload,
                'uploadQueue': this.state.queue,
                'gifMaker': this.props.makerPage,
            });
            this.props.makerPage.trackEvent({
                eventName: 'upload_signin_upsell_show',
                params: {
                    'viewindex': numUploadsAttempting
                },
            });
            return;
        }

        this.setState({
            pageUploadStatus: ITEM_STATES.INPROGRESS
        });

        // TODO move gif upload and error handling to UploadObject class
        const finished = () => {
            if (numUploadsFailed > 0) {
                this.props.isMobile && window.scrollTo(0, 0);
                window.setTimeout(() => {
                    this.setState({
                        pageUploadStatus: ITEM_STATES.PENDING,
                        firstUploadAttempt: false,
                        uploadProgress: [],
                    });
                    this.props.makerPage.resetPageErrors(pageErrors);
                }, 2000);

                this.props.makerPage.trackEvent({
                    eventName: 'uploads_complete_some_failure',
                    params: {
                        'viewindex': numUploadsSuccessful,
                        'info': numUploadsFailed,
                        'actions': editorToolsUsageTracking,
                    },
                });
            } else {
                window.setTimeout(() => {
                    this.setState({
                        pageUploadStatus: ITEM_STATES.DONE
                    }, () => {
                        this.props.makerPage.goToProfile();
                    });
                }, 1500);

                this.props.makerPage.trackEvent({
                    eventName: 'uploads_complete_all_success',
                    params: {
                        'viewindex': numUploadsSuccessful,
                        'actions': editorToolsUsageTracking,
                    },
                });
            }
        };

        const handleFailure = (uploadObject) => {
            return (response) => {
                numUploadsFailed++;

                let errorMsg;
                if (typeof response.error !== 'string') {
                    errorMsg = Object.entries(response.error).map(([key, value]) => {
                        return `${key[0].toUpperCase()}${key.slice(1)} ${value}.`;
                    }).join('  ');
                } else {
                    console.log('ERROR: ', response.error);
                    errorMsg = gettextSub('Unknown Error. Upload failed.');
                }
                uploadObject.uploadStatus = ITEM_STATES.FAILURE;

                // NOTE delay on item error message to allow for animation
                window.setTimeout(() => {
                    uploadObject.uploadErrorMessage = errorMsg;
                }, 2000);

                pageErrors.push({
                    type: 'upload',
                    message: errorMsg,
                });

                create();
            };
        };

        const handleSuccess = (uploadObject) => {
            return (response) => {
                numUploadsSuccessful++;
                const id = response.postid.toString();
                this.registerUserUploadEvent('upload_process_completed', uploadObject, id);
                if (uploadObject.hasGifData()) {
                    uploadService.addUnprocessedUpload(id, uploadObject.gifData.gif);
                } else {
                    // TODO figure out how to handle video upload w/ uploadService...
                }
                uploadObject.uploadStatus = ITEM_STATES.DONE;
                create();
            };
        };

        const create = () => {
            this.triggerUpdate();
            if (i >= this.state.queue.length) {
                finished();
                return;
            }
            const uploadObject = this.state.queue[i];

            const progressCB = this.uploadProgressCallback(i);

            i++;

            if (uploadObject.uploadStatus === ITEM_STATES.DONE) {
                // skip ones that have already been processed.
                create();
                return;
            }
            uploadObject.uploadStatus = ITEM_STATES.INPROGRESS;
            this.triggerUpdate();
            this.registerUserUploadEvent('upload', uploadObject);

            uploadObject.editorToolsUsageTrackingList.forEach((tool) => {
                editorToolsUsageTracking[tool] = true;
            });

            const formData = new FormData();
            const postData = {
                stream: 'savedriffs',
                collectionid: `keyboarduser-${userId}`,
                tags: uploadObject.tags.join(','),
            };
            for (const key of Object.keys(postData)) {
                formData.append(key, postData[key]);
            }

            // upload file if available (gif, video, or edited url)
            if (uploadObject.isFileUpload()) {
                const {
                    file,
                    name
                } = uploadObject.getFileUploadData();

                formData.append('file', file, name);
                this.context.apiService.uploadGif({
                    data: formData,
                    progressCB,
                }).then(
                    handleSuccess(uploadObject), handleFailure(uploadObject)
                );
            } else if (uploadObject.isUrlUpload()) {
                const url = uploadObject.getUploadUrl();
                formData.append('url', url);

                this.context.apiService.uploadGifUrl({
                    data: formData,
                    progressCB,
                }).then(
                    handleSuccess(uploadObject), handleFailure(uploadObject)
                );
            } else {
                console.error('Cannot upload gif. Missing data.');
            }
        };

        create();
    }

    @autobind
    uploadProgressCallback(i) {
        return (e) => {
            if (e.lengthComputable) {
                const uploadProgress = this.state.uploadProgress;
                uploadProgress[i] = e.loaded / e.total;
                this.setState({
                    uploadProgress,
                });
            }
        };
    }

    @autobind
    fileChange(event) {
        console.log(`FILE PICKER -- EVENT`, event);
        let files;
        if (event.dataTransfer && event.dataTransfer.files.length) {
            files = event.dataTransfer.files;
        } else {
            files = event.target.files;
        }
        const numFilesSelected = files.length;
        const mediaFormatsList = createMediaFormatsList({
            queue: Object.values(files),
            type: 'file',
        });

        this.props.makerPage.trackEvent({
            eventName: 'uploads_selected_addmore',
            params: {
                'actions': 'file',
                'viewindex': numFilesSelected,
                'category': mediaFormatsList,
            },
        });

        this.props.makerPage.addItemsToQueue(files);
    }

    renderEditingProgressBar(uploadObject) {
        const progress = uploadObject.editorStatus || 0;
        return ( <
            div className = "creator-progress-overlay" >
            <
            div className = "shadow-overlay" > < /div> <
            ProgressCircle radius = {
                20
            }
            thickness = {
                4
            }
            color = {
                '#ffffff'
            }
            smoothing = {
                true
            }
            progress = {
                progress
            }
            /> <
            /div>
        );
    }

    renderUploadStatusOverlay(i) {
        const uploadObject = this.state.queue[i];
        let pct = this.state.uploadProgress[i] || 0;
        pct = Math.floor(parseFloat(pct) * 100);

        let statusIcon;
        let statusMessage;
        let uploadComplete = false;
        let hideOverlay;

        if (uploadObject.uploadStatus === ITEM_STATES.DONE) {
            uploadComplete = true;
            statusIcon = '/assets/icons/success-icon.svg';
            statusMessage = 'File upload success';
        } else if (uploadObject.uploadStatus === ITEM_STATES.FAILURE) {
            uploadComplete = true;
            statusIcon = '/assets/icons/error-icon.svg';
            statusMessage = 'An error occurred';
            hideOverlay = true;
        }

        // scrolls upload item into view on mobile at beginning of item upload
        if (uploadObject.uploadStatus === ITEM_STATES.INPROGRESS && pct == 0 && this.props.isMobile) {
            const uploadItem = document.getElementById(`upload_item_${i}`);
            uploadItem && uploadItem.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }

        return ( <
            div className = {
                `item-status-overlay ${hideOverlay ? 'hide' : ''}`
            } >
            <
            div className = {
                `upload-progress-details ${uploadComplete ? 'hide' : ''}`
            } >
            <
            div className = "message" > {
                `${pct}%`
            } < /div> <
            div className = "progressbarv2" >
            <
            div className = "progress"
            style = {
                {
                    width: `${pct}%`,
                }
            }
            /> <
            /div> <
            /div>

            <
            div className = {
                `upload-completion-details ${uploadComplete ? '' : 'hide'}`
            } >
            <
            img className = "status-icon"
            src = {
                statusIcon
            }
            /> <
            div className = "message" > {
                statusMessage
            } < /div> <
            /div> <
            /div>
        );
    }

    renderTagsList(uploadObject) {
        let tags = uploadObject.tags.slice().reverse();
        let combinedTag;
        const isEditable = [ITEM_STATES.PENDING, ITEM_STATES.FAILURE].includes(uploadObject.uploadStatus);
        if (!tags.length) {
            return <div > < /div>;
        }
        if (!uploadObject.tagsExpanded && tags.length > 3) {
            combinedTag = <
                button className = "tag-item combined"
            onClick = {
                    (e) => {
                        uploadObject.tagsExpanded = true;
                        this.triggerUpdate();
                    }
                } > {
                    `+${tags.length - 3}`
                } <
                /button>;
            tags = tags.slice(0, 3);
        }
        const tagsList = tags.map((tag) => {
            const color = TAG_COLORS[(tag.charCodeAt(tag.length - 1) + tag.charCodeAt(0)) % TAG_COLORS.length];
            return ( <
                div className = "tag-item"
                style = {
                    {
                        backgroundColor: color
                    }
                } >
                {
                    this.formatTagString(tag)
                } {
                    isEditable &&
                        <
                        button className = "remove-tag"
                    onClick = {
                        this.removeTag(tag, uploadObject)
                    }
                    />
                } <
                /div>
            );
        });

        return ( <
            div className = "tags-list" > {
                combinedTag ? tagsList.concat([combinedTag]) : tagsList
            } <
            /div>
        );
    }

    @autobind
    handleCancelButton(e) {
        // e.preventDefault();
        const gettextSub = this.context.gtService.gettextSub;
        dialog.open('confirmation-dialog', {
            confirmCallback: this.props.makerPage.clearQueue,
            header: gettextSub(`Cancel upload?`),
            message: gettextSub(`Changes you've made will not be saved.`),
            denyButtonText: gettextSub(`No`),
            confirmButtonText: gettextSub(`Yes`),
        });
    }

    renderTaggingQueue() {
        const pageUploadInProgress = this.state.pageUploadStatus === ITEM_STATES.INPROGRESS;

        const taggingListItems = this.state.queue.map((uploadObject, i) => {
            const isVideo = uploadObject.onlyHasVideoData();
            const gifEditingInProgress = uploadObject.editorStatus !== null;
            const uploadStatus = uploadObject.uploadStatus;
            const imageViewerDisabled = pageUploadInProgress || uploadStatus === ITEM_STATES.DONE;
            const displayToolBar = !gifEditingInProgress && !pageUploadInProgress && uploadStatus !== ITEM_STATES.DONE;
            const isStaticImageUpload = uploadObject.isStaticImageUpload();
            const isEditable = !isStaticImageUpload;

            return ( <
                div className = "queue-item-wrappper" >
                <
                div id = {
                    `upload_item_${i}`
                }
                className = "queue-item" >
                <
                div className = "item-left" >
                <
                div className = "upload-preview-img-wrapper" > {
                    isVideo &&
                    <
                    video
                    className = {
                        `gif-img-preview ${imageViewerDisabled ? 'disabled' : ''}`
                    }
                    muted = {
                        true
                    }
                    playsinline = {
                        true
                    }
                    autoplay = {
                        true
                    }
                    loop = {
                        true
                    }
                    onClick = {
                        this.props.isMobile ? undefined : this.openImageViewerDialog(i)
                    }
                    disabled = {
                        imageViewerDisabled
                    }
                    src = {
                        uploadObject.videoData.video.src
                    }
                    type = "video/mp4" /
                    >
                }

                {
                    !isVideo &&
                        <
                        img
                    className = {
                        `gif-img-preview ${imageViewerDisabled ? 'disabled' : ''}`
                    }
                    src = {
                        uploadObject.gifData.image.src
                    }
                    onClick = {
                        this.props.isMobile ? undefined : this.openImageViewerDialog(i)
                    }
                    disabled = {
                        imageViewerDisabled
                    }
                    />
                }

                {
                    gifEditingInProgress && this.renderEditingProgressBar(uploadObject)
                }

                {
                    displayToolBar &&
                        <
                        div className = "item-toolbar" >
                        <
                        button
                    className = "remove-queue-item-button"
                    onClick = {
                            this.handleRemoveButton(i)
                        } >
                        <
                        Icon name = 'delete-icon' / >
                        <
                        /button>

                    {
                        isEditable &&
                            <
                            button
                        className = "edit-button"
                        onClick = {
                            this.openImageViewerDialog(i, true)
                        }
                        disabled = {
                                gifEditingInProgress
                            } >
                            <
                            Icon name = 'pencil-icon' / >
                            <
                            /button>
                    } {
                        isStaticImageUpload &&
                            <
                            button
                        className = "info-button"
                        onClick = {
                                this.handleStaticImageInfoButton()
                            } >
                            <
                            Icon name = 'info-outline-icon' / >
                            <
                            /button>
                    } <
                    /div>
                } <
                /div> <
                /div>

                <
                div className = "item-right" >
                <
                div className = "tag-selection-section" >

                <
                TagSearchBox uploadObject = {
                    uploadObject
                }
                queue = {
                    this.props.queue
                }
                taggingView = {
                    this
                }
                idx = {
                    i
                }
                /> {
                    this.renderTagsList(uploadObject)
                } {
                    uploadObject.uploadErrorMessage !== null &&
                        <
                        div className = {
                            `item-upload-errors ${(uploadStatus === ITEM_STATES.INPROGRESS) ? 'hide' : ''}`
                        } >
                        <
                        img className = "status-icon"
                    src = '/assets/icons/error-icon.svg' / > {
                            uploadObject.uploadErrorMessage
                        } <
                        /div>
                } <
                /div> <
                /div> <
                /div> {
                    (pageUploadInProgress || uploadStatus === ITEM_STATES.DONE) &&
                    this.renderUploadStatusOverlay(i)
                } <
                /div>
            );
        });
        return <div className = "tagging-queue" > {
            taggingListItems
        } < /div>;
    }

    renderPageErrors() {
        return ( <
            div className = "tagging-page-error-section" > {
                this.state.pageErrorMessages.map((msg) => {
                    return ( <
                        div className = "error-message" >
                        <
                        img src = "/assets/icons/error-icon.svg" / > {
                            msg
                        } <
                        /div>
                    );
                })
            } <
            /div>
        );
    }

    render() {
        const gettextSub = this.context.gtService.gettextSub;
        const maxUploads = this.props.makerPage.maxUploads();
        const allowUserToAddMoreGifs = (
            this.state.pageUploadStatus === ITEM_STATES.PENDING &&
            this.state.queue.length < maxUploads &&
            this.state.firstUploadAttempt
        );

        return ( <
            div className = "TaggingView container" >
            <
            NavigationPrompt when = {!this.props.itemPageCaptioning.status && this.state.pageUploadStatus !== ITEM_STATES.DONE
            }
            message = "Are you sure you want to leave this page?" /
            >
            <
            div className = "section-header mobile-only" >
            <
            h2 > {
                gettextSub(`Edit and Tag your content`)
            } < /h2> <
            p > {
                gettextSub(`Add descriptive tags so your content can be found and shared!`)
            } < /p> <
            p > {
                gettextSub(`Tap the edit icon to trim, crop, and caption.`)
            } < /p>

            {
                this.renderPageErrors()
            } <
            /div>

            <
            section className = "section-tagging-queue" > {
                this.renderTaggingQueue()
            } {
                allowUserToAddMoreGifs &&
                    <
                    UploadDropZone
                className = 'non-mobile-only'
                id = 'tagging-dropzone'
                onChange = {
                    this.fileChange
                }
                multiple = {
                        true
                    } >
                    <
                    div className = "dropzone-left" >
                    <
                    div className = "upload-file-icon" / >
                    <
                    /div> <
                    div className = "dropzone-right" >
                    <
                    h2 > {
                        gettextSub(`Add more content`)
                    } < /h2> <
                    p > {
                        gettextSub(`Drag and drop files (or click here)`)
                    } < /p> <
                    /div> <
                    /UploadDropZone>
            }

            <
            /section>

            <
            section className = "section-page-info" >
            <
            div className = "info-box non-mobile-only" >
            <
            div className = "section-header" >
            <
            h2 > {
                gettextSub(`Edit and Tag your content`)
            } < /h2> <
            p > {
                gettextSub(`Add descriptive tags so your content can be found and shared!`)
            } < /p> <
            p > {
                gettextSub(`Click the edit icon to trim, crop, and caption.`)
            } < /p> <
            /div> {
                this.renderPageErrors()
            } <
            /div>

            <
            div className = {
                `buttons-row ${this.props.isMobile && 'container'}`
            } >
            <
            button className = "cancel"
            disabled = {
                this.state.pageUploadStatus === ITEM_STATES.INPROGRESS
            }
            onClick = {
                this.handleCancelButton
            } > {
                gettextSub('CANCEL')
            } <
            /button> <
            button type = "submit"
            onClick = {
                this.startUpload
            }
            className = {
                this.uploadDisabled() ? 'disabled' : ''
            } >
            {
                this.state.pageUploadStatus === ITEM_STATES.INPROGRESS &&
                <
                div className = "button-content" >
                <
                ProgressCircleIndeterminate
                diameter = {
                    14
                }
                strokeWidthRatio = {
                    .15
                }
                color = {
                    '#ffffff'
                }
                animationDuration = {
                    1000
                }
                /> {
                    gettextSub('Uploading...')
                } <
                /div>
            } {
                this.state.pageUploadStatus !== ITEM_STATES.INPROGRESS &&
                    <
                    div className = "button-content" >
                    <
                    img src = '/assets/icons/upload-icon.svg' / > {
                        gettextSub('Upload To Tenor')
                    } <
                    /div>
            } <
            /button> <
            /div>

            <
            /section> <
            /div>
        );
    }
}