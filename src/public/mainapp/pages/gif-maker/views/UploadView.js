import {
    autobind
} from 'core-decorators';
import {
    Component
} from 'inferno'; // eslint-disable-line no-unused-vars
import {
    CustomComponent,
    Link,
    TooltipWrapper
} from '../../../../common/components';
import {
    StaticImageInfoWrapper
} from '../../../components/StaticImageInfoIcon';
import {
    Icon
} from '../../../../common/components/Icon';
import {
    subscribe
} from '../../../../../replete';
import {
    UploadDropZone,
    UploadButton
} from '../components/UploadDropZone';
import {
    SETTINGS
} from '../constants';
import {
    KEY
} from '../../../../common/constants';
import {
    createMediaFormatsList
} from '../util';
import {
    getFileExtension,
    isValidFileType
} from '../../../../common/util/files';
import {
    ProgressCircleIndeterminate
} from '../../../../common/components/ProgressCircle';
import dialog from '../../../../common/dialog';
import storageService from '../../../../common/services/storageService';

import './UploadView.scss';
import {
    OfficialBadge
} from '../../../components/OfficialBadge';

@subscribe({
    isMobile: ['ui.isMobile'],
    makerPage: ['ui.GifMakerPage.makerPage'],
    itemPageCaptioning: ['ui.GifMakerPage.itemPageCaptioning'],
})
export class UploadView extends CustomComponent {
    constructor(props, context) {
        super(props, context);
        this.state = {
            pageErrorMessages: this.parsePageErrors(),
            stagingInProgress: false,
            validUrl: false,
            dropHover: false,
        };
        this.partnerLogos = {
            gboard: '/assets/img/about/about-us/apipartners/gboard.png',
            linkedin: '/assets/img/about/about-us/apipartners/linkedin.png',
            facebook: '/assets/img/about/about-us/apipartners/facebook.png',
            twitter: '/assets/img/about/about-us/apipartners/twitter.png',
            whatsapp: '/assets/img/about/about-us/apipartners/whatsapp.png',
        };
        this.staticBeta = context.featureFlags.staticImageBetaEnabled;
    }

    componentDidMount() {
        this.staticBeta && this.showMemesBetaDialog();
    }

    showMemesBetaDialog() {
        const loggedIn = this.context.authService.isLoggedIn();
        const alreadyViewed = storageService.getItem('staticImageBetaDialogViewed');
        if (loggedIn && !alreadyViewed) {
            setTimeout(() => dialog.open('static-image-dialog'), 0); // NOTE need timeout or else doesn't trigger
        }
    }

    componentDidUpdate(prevProps) {
        if (this.props.pageErrorsUpdated) {
            this.setState({
                pageErrorMessages: this.parsePageErrors(),
            });
            this.props.makerPage.setState({
                pageErrorsUpdated: false
            });
        }
        if (this.props.queueUpdated) {
            this.setState({
                stagingInProgress: false,
            });
            this.props.makerPage.setState({
                queueUpdated: false
            });
        }
    }

    @autobind
    parsePageErrors() {
        return this.props.makerPage.parsePageErrors(this.props.pageErrors);
    }
    @autobind
    resetPageErrors() {
        this.props.makerPage.resetPageErrors();
    }

    @autobind
    urlInput(event) {
        const url = event.target.value;
        const mediaType = getFileExtension({
            url
        });
        const allowedUrlTypes = this.staticBeta ? SETTINGS.ALLOWED_URLS_STATIC_BETA : SETTINGS.ALLOWED_URLS;
        const validGifUrl = isValidFileType({
            url
        }, allowedUrlTypes);

        this.setState({
            url,
            validUrl: validGifUrl,
        });
        this.props.pageErrors.length && this.resetPageErrors();

        if (validGifUrl) {
            this.setState({
                stagingInProgress: true,
            });

            this.props.makerPage.trackEvent({
                eventName: 'uploads_selected',
                params: {
                    'actions': 'url',
                    'viewindex': '1', // num urls selected
                    'category': mediaType,
                },
            });

            setTimeout(() => {
                this.props.makerPage.addItemsToQueue([this.state.url]);
            }, 500);
        }
        this.triggerUpdate();
        event.target.focus();
    }

    @autobind
    handleUrlSubmit(event) {
        if (event.keyCode === KEY.ENTER) {
            event.preventDefault(); // remove?
            const pageErrors = [{
                type: 'url-input',
                message: 'Please enter a valid URL.',
            }];
            this.props.makerPage.resetPageErrors(pageErrors);
        }
    }

    @autobind
    fileChange(event) {
        this.resetPageErrors();
        this.setState({
            stagingInProgress: true
        });
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
            eventName: 'uploads_selected',
            params: {
                'actions': 'file',
                'viewindex': numFilesSelected,
                'category': mediaFormatsList,
            },
        });

        // NOTE using setTimeout to ensure that state.stagingInProgress is updated before processing begins
        window.setTimeout(() => this.props.makerPage.addItemsToQueue(files), 0);
    }

    @autobind
    handleUploadButtonClick(source) {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
        this.trackFileSelectionEvent(source);
    }

    @autobind
    handleUploadDropZoneClick(source) {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
        this.trackFileSelectionEvent(source);
    }

    @autobind
    handleUploadDropZoneDragEnter(source) {
        this.setState({
            dropHover: true
        });
        this.trackFileSelectionEvent(source);
    }

    @autobind
    handleUploadDropZoneDragLeave() {
        this.setState({
            dropHover: false
        });
    }

    @autobind
    trackFileSelectionEvent(source) {
        this.props.makerPage.trackEvent({
            eventName: 'splash_upload_tap',
            params: {
                actions: source,
            },
        });
    }

    render() {
        const gettextSub = this.context.gtService.gettextSub;
        const {
            makerPage,
            isMobile,
            pageErrors
        } = this.props;
        const gettextSubComponent = this.context.gtService.gettextSubComponent;
        if (this.props.itemPageCaptioning.status) {
            return ( <
                div className = "UploadView" / >
            );
        }
        const validUrlSubmitted = this.state.validUrl && !this.state.pageErrorMessages.length;
        const maxUploads = makerPage.maxUploads();
        const gifAttributionToolTipMsg = ( <
            Link to = {
                '/official/spongebobmovie'
            }
            className = 'gif-attribution-tooltip' >
            <
            img className = 'profile-image'
            src = 'https://media.tenor.com/images/89d2991b4f7dda58094afd0820833178/strip256x256.jpeg' / >
            <
            span > SpongeBob SquarePants < /span> <
            OfficialBadge tooltip = {
                false
            }
            flags = {
                'partner'
            }
            /> <
            /Link>
        );

        return ( <
            div className = "UploadView" >
            <
            div className = {
                `upload-scrim-layer ${this.state.dropHover ? '' : 'hidden'}`
            } >
            <
            h1 > {
                gettextSub(`Drop to upload!`)
            } < /h1> <
            p > {
                gettextSub(`upload your media files by dropping them here`)
            } < /p> <
            /div> <
            div className = "mask-layer" >

            <
            div className = 'left-mask' >
            <
            img className = "tonal-circle-left"
            src = {
                `/assets/img/gifmaker/tonal-circle-1.svg`
            }
            />

            <
            div className = 'circle-gif-mask-wrapper' >
            <
            TooltipWrapper size = 'compact'
            tooltipMsg = {
                gifAttributionToolTipMsg
            } >
            <
            svg className = 'circle-gif-mask'
            width = "322"
            height = "322"
            viewBox = "0 0 322 322"
            fill = "none"
            xmlns = "http://www.w3.org/2000/svg" >
            <
            defs >
            <
            clipPath id = "circleView" >
            <
            ellipse cx = "160.938"
            cy = "160.965"
            rx = "160.938"
            ry = "160.965"
            fill = "white" / >
            <
            /clipPath> <
            /defs> <
            image clipPath = "url(#circleView)"
            href = 'https://media1.tenor.com/images/5e935f8d2808ca4f45ffd7381bd417a6/tenor.gif?itemid=20224426' / >
            <
            /svg> <
            /TooltipWrapper> <
            /div> <
            /div>

            <
            div className = 'top-mask' >
            <
            img className = "tonal-circle-top"
            src = {
                `/assets/img/gifmaker/tonal-circle-2.svg`
            }
            />

            <
            div className = 'triangle-gif-mask-wrapper' >
            <
            TooltipWrapper size = 'compact'
            tooltipMsg = {
                gifAttributionToolTipMsg
            } >
            <
            svg className = 'triangle-gif-mask'
            width = "234"
            height = "213"
            viewBox = "0 0 234 213"
            fill = "none"
            xmlns = "http://www.w3.org/2000/svg" >
            <
            defs >
            <
            clipPath id = "triangleView" >
            <
            path d = "M88.5638 17.3305C101.189 -4.53624 132.75 -4.53628 145.375 17.3304L229.496 163.031C242.12 184.898 226.34 212.232 201.09 212.232H32.849C7.59946 212.232 -8.18144 184.898 4.44332 163.031L88.5638 17.3305Z"
            fill = "white" / >
            <
            /clipPath> <
            /defs> <
            image clipPath = "url(#triangleView)"
            href = 'https://media1.tenor.com/images/337af8f2dc0eda3bb46746d4d7cb27d7/tenor.gif?itemid=20224422' / >
            <
            /svg> <
            /TooltipWrapper> <
            /div> <
            /div>

            <
            div className = 'right-mask' >
            <
            img className = "tonal-rounded-rect"
            src = {
                `/assets/img/gifmaker/tonal-rounded-rect.svg`
            }
            /> <
            /div> <
            /div> <
            UploadDropZone className = {
                `upload-page ${this.state.dropHover ? 'dropHover' : ''}`
            }
            id = 'fullpage'
            fullPage = {
                true
            }
            onChange = {
                this.fileChange
            }
            onDragEnter = {
                isMobile ? null : () => this.handleUploadDropZoneDragEnter('splash_drag')
            }
            onDragLeave = {
                isMobile ? null : this.handleUploadDropZoneDragLeave
            }
            disabled = {
                this.state.stagingInProgress
            }
            multiple = {
                true
            } >
            < /UploadDropZone> <
            section className = "hero"
            role = "main"
            aria - label = {
                gettextSub('Upload and Create')
            } >
            <
            div className = "container" >
            <
            div className = "content" >
            <
            div className = "value-prop" > { /* FIXME: use gettextSubComponent for this text block? */ } <
            h1 >
            <
            span className = 'blue' > Upload < /span> <
            span > GIFs and stickers, or < /span> <
            span className = 'blue' > create < /span> <
            span > them from MP4s < /span> <
            /h1> <
            p > {
                gettextSub(`If it helps you express, this is the place for it.
                                    And if it needs some fine tuning, you can trim, crop, and caption
                                    before sharing to Twitter, Facebook, and just about everywhere inbetween.`)
            } <
            /p> <
            /div>

            <
            div className = 'uploader-card'
            role = "region"
            aria - label = {
                gettextSub('Uploader')
            } >
            <
            UploadDropZone className = {
                `upload-file-section`
            }
            id = 'splash'
            onClick = {
                () => this.handleUploadDropZoneClick('splash')
            }
            onChange = {
                this.fileChange
            }
            disabled = {
                this.state.stagingInProgress
            }
            multiple = {
                true
            } >
            <
            img className = 'file-illustration'
            src = {
                `/assets/img/gifmaker/file-illustration.svg`
            }
            /> {
                isMobile ?
                    <
                    h3 > {
                        gettextSub(`Tap to Upload Here`)
                    } < /h3> : <
                    h3 > {
                        gettextSub(`Drag & Drop to Upload Here`)
                    } < /h3>
            }

            {
                this.staticBeta &&
                    <
                    p className = "upload-details" > {
                        gettextSubComponent(`Up to {maxUploads} GIFs, MP4s, {pngStaticImageInfo}, {jpgStaticImageInfo}`, {
                            maxUploads: < span className = 'max-uploads-text' > {
                                maxUploads
                            } < /span>,
                            pngStaticImageInfo:
                                <
                                StaticImageInfoWrapper
                            type = 'gifmaker-landing' >
                            <
                            span className = 'static-beta-type' >
                            <
                            span > PNGs < /span> <
                            img src = {
                                `/assets/img/dotted-underline.svg`
                            }
                            /> <
                            /span> <
                            /StaticImageInfoWrapper>,
                            jpgStaticImageInfo:
                                <
                                StaticImageInfoWrapper
                            type = 'gifmaker-landing' >
                            <
                            span className = 'static-beta-type' >
                            <
                            span > JPGs < /span> <
                            img src = {
                                `/assets/img/dotted-underline.svg`
                            }
                            /> <
                            /span> <
                            /StaticImageInfoWrapper>,
                        })
                    } <
                    /p>
            }

            {
                !this.staticBeta &&
                    <
                    p className = "upload-details" > {
                        gettextSubComponent(`Up to {maxUploads} GIFs or MP4s`, {
                            maxUploads: < span className = 'blue' > & nbsp; {
                                maxUploads
                            } & nbsp; < /span>,
                        })
                    } <
                    /p>
            }

            {
                this.state.stagingInProgress &&
                    <
                    ProgressCircleIndeterminate
                diameter = {
                    40
                }
                strokeWidthRatio = {
                    .1
                }
                color = {
                    '#007add'
                }
                animationDuration = {
                    1500
                }
                />
            } <
            UploadButton id = 'upload-file-section-button'
            onClick = {
                () => this.handleUploadButtonClick('splash_button')
            }
            onChange = {
                this.fileChange
            }
            disabled = {
                this.state.stagingInProgress
            }
            multiple = {
                true
            } >
            <
            span className = 'create-gifs-button-label' >
            <
            span className = 'text' > {
                'Browse Files'
            } < /span> <
            /span> <
            /UploadButton> <
            /UploadDropZone>

            <
            div className = {
                `upload-url-section ${pageErrors.some((error) => error.type === 'url-input') ? 'error' : ''}`
            } >
            <
            h3 > URL Upload < /h3> <
            p className = 'url-upload-details' > {
                gettextSub('Any GIF, MP4, PNG, or JPG URL')
            } < /p> <
            div className = 'input-component' >
            <
            input id = "upload_url"
            type = "text"
            value = {
                this.state.url
            }
            onInput = {
                this.urlInput
            }
            onKeyDown = {
                this.handleUrlSubmit
            }
            onBlur = {
                this.resetPageErrors
            }
            disabled = {
                this.state.stagingInProgress
            }
            className = {
                `${validUrlSubmitted ? 'feedback-valid' : ''} ${pageErrors.some((error) => error.type === 'url-input') ? 'error' : ''}`
            }
            name = 'url'
            placeholder = {
                gettextSub('Paste a media URL')
            }
            autocomplete = 'off'
            spellcheck = 'false' / >
            <
            div className = "error-section" > {!this.state.stagingInProgress && this.state.pageErrorMessages.map((msg) => {
                        return ( < span > {
                                msg
                            } < /span>);
                        })
                } <
                /div> <
                /div> <
                /div> <
                Link className = "legal-terms"
                to = {
                    '/legal-terms'
                }
                external = {
                    true
                } > {
                    `Terms & Privacy`
                } < /Link> <
                /div>

                <
                /div> <
                /div> <
                /section>

                <
                section className = "overview"
                role = "region"
                aria - label = {
                    gettextSub('Getting Started')
                } >
                <
                div className = "container" >
                <
                h2 > {
                    gettextSub(`Getting started on Tenor`)
                } <
                /h2> <
                div className = "content" >
                <
                div className = "item" >
                <
                div className = "img-wrapper" >
                <
                img className = "build"
                src = {
                    `/assets/img/gifmaker/library.png`
                }
                /> <
                /div> <
                h3 > {
                    gettextSub(`Build your Library`)
                } < /h3> <
                p > {
                    gettextSub(`Upload and edit your GIFs, stickers, or short MP4s to your Tenor profile to share with friends and family`)
                } < /p> <
                /div> <
                div className = "item" >
                <
                div className = "img-wrapper" >
                <
                img className = "discover"
                src = {
                    `/assets/img/gifmaker/tag.png`
                }
                /> <
                /div> <
                h3 > {
                    gettextSub(`Tag and Discovery`)
                } < /h3> <
                p > {
                    gettextSub(`Tag your GIFs to be discovered & Shared. Search for your content on Tenor’s partners, including Gboard, Twitter, and many more.`)
                } < /p>

                <
                /div> <
                div className = "item" >
                <
                div className = "img-wrapper" >
                <
                img className = "share"
                src = {
                    `/assets/img/gifmaker/share.png`
                }
                /> <
                /div> <
                h3 > {
                    gettextSub(`Share with millions`)
                } < /h3> <
                p > {
                    gettextSub(`Get notified on how your GIFs are performing and how often they've been searched and shared.`)
                } < /p> <
                /div> <
                /div> <
                /div> <
                /section>

                <
                section className = "create"
                role = "region"
                aria - label = {
                    gettextSub('Creation Tools')
                } >
                <
                div className = "container" >
                <
                div className = "content" >

                <
                div className = "copy-section" >
                <
                h2 > {
                    gettextSub(`Create your own GIFs`)
                } < /h2> <
                p > {
                    gettextSub(`Creating GIFs is fun and easy! Edit the GIFs and MP4s that you upload to Tenor by trimming, cropping, and adding custom captions to your content`)
                } < /p> <
                UploadButton
                className = 'upload-button'
                id = 'create-section-button'
                onClick = {
                    () => this.handleUploadButtonClick('edit_info')
                }
                onChange = {
                    this.fileChange
                }
                disabled = {
                    this.state.stagingInProgress
                }
                multiple = {
                    true
                } >
                <
                span className = 'create-gifs-button-label' >
                <
                img src = "/assets/img/gifmaker/palette-icon.svg" / >
                <
                span className = 'text' > {
                    'Create GIFs'
                } < /span> <
                /span> <
                /UploadButton> <
                /div>

                <
                div className = "image-section" >
                <
                div className = "create-gif-animation-wrapper" >
                <
                div className = "create-gif-animation" >
                <
                UploadDropZone
                id = 'create-section-image'
                onClick = {
                    () => this.handleUploadDropZoneClick('edit_image')
                }
                onChange = {
                    this.fileChange
                }
                disabled = {
                    this.state.stagingInProgress
                }
                multiple = {
                    true
                }
                reference = {
                    (el) => this.editImageDropZoneEl = el
                }
                /> <
                img src = {
                    `/assets/img/gifmaker/create.gif`
                }
                onClick = {
                    () => this.editImageDropZoneEl.click()
                }
                /> <
                Icon name = "trim-icon"
                className = "hovering-tool-icon"
                onClick = {
                    () => this.editImageDropZoneEl.click()
                }
                /> <
                Icon name = "crop-icon"
                className = "hovering-tool-icon"
                onClick = {
                    () => this.editImageDropZoneEl.click()
                }
                /> <
                Icon name = "caption-icon"
                className = "hovering-tool-icon"
                onClick = {
                    () => this.editImageDropZoneEl.click()
                }
                /> <
                Icon name = "pencil-icon"
                onClick = {
                    () => this.editImageDropZoneEl.click()
                }
                /> <
                /div> <
                div className = "create-gif-animation-border" >
                <
                div className = "image-border" > < /div> <
                div className = "pencil-border" > < /div> <
                /div> <
                /div> <
                /div>

                <
                /div> <
                /div> <
                /section>

                <
                section className = "share"
                role = "complementary"
                aria - label = {
                    gettextSub('Share Anywhere')
                } >
                <
                div className = "container" >
                <
                div className = "content" >

                <
                div className = "item-left" >
                <
                div className = 'phone' >
                <
                div className = 'phone-body' >
                <
                div className = 'phone-body2' > < /div> <
                /div> <
                div className = 'speaker-top' > < /div> <
                div className = 'lock-button' > < /div> <
                div className = 'volume-button' > < /div> <
                /div> <
                video
                src = {
                    `/assets/img/gifmaker/phone.mp4`
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
                /> <
                /div>

                <
                div className = "item-right" >
                <
                h2 > {
                    gettextSub(`Share anywhere`)
                } < /h2> <
                p > {
                    gettextSubComponent(`Access GIFs you uploaded anytime from Tenor products including the Tenor website and {appStoreLink}. Tenor also powers GIF search for Gboard, Facebook, Twitter, Line, WhatsApp, and more!`, {
                        appStoreLink: < Link className = 'appstore-link'
                        to = "https://apps.apple.com/app/apple-store/id917932200?pt=39040802&ct=GifMaker&mt=8"
                        external = {
                            true
                        } > {
                            gettextSub('GIF Keyboard')
                        } < /Link>,
                    })
                } <
                /p> <
                UploadButton
                className = 'upload-button'
                id = 'share-section-button'
                onClick = {
                    () => this.handleUploadButtonClick('share_info')
                }
                onChange = {
                    this.fileChange
                }
                disabled = {
                    this.state.stagingInProgress
                }
                multiple = {
                    true
                } >
                <
                span > {
                    gettextSub('Get Started')
                } < /span> <
                /UploadButton> <
                div className = "partner-logos" >
                <
                div className = "logo-row" >
                <
                img className = "whatsapp"
                src = {
                    this.partnerLogos.whatsapp
                }
                /> <
                img className = "gboard"
                src = {
                    this.partnerLogos.gboard
                }
                /> <
                img className = "linkedin"
                src = {
                    this.partnerLogos.linkedin
                }
                /> <
                /div> <
                div className = "logo-row" >
                <
                img className = "facebook"
                src = {
                    this.partnerLogos.facebook
                }
                /> <
                img className = "twitter"
                src = {
                    this.partnerLogos.twitter
                }
                /> <
                /div> <
                /div> <
                /div> <
                /div> <
                /div> <
                /section> <
                /div>
            );
        }
    }