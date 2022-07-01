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
    ProgressCircleIndeterminate
} from '../../../../common/components/ProgressCircle';
import {
    ITEM_STATES
} from '../constants';
import dialog from '../../../../common/dialog';

import {
    subscribe
} from '../../../../../replete';

import './CreateGifButton.scss';

@subscribe({
    isMobile: ['ui.isMobile'],

    makerPage: ['ui.GifMakerPage.makerPage'],
    queueIdx: ['ui.GifMakerPage.queueIdx'],
    itemPageCaptioning: ['ui.GifMakerPage.itemPageCaptioning'],

    editor: ['ui.GifEditor.editor'],
    editorToolsUsageTracking: ['ui.GifEditor.editorToolsUsageTracking'],
    encodingStatus: ['ui.GifEditor.encodingStatus'],
})
export class CreateGifButton extends CustomComponent {
    constructor(props, context) {
        super(props, context);
    }

    @autobind
    create(event) {
        const uploadObject = this.props.queue[this.props.queueIdx];
        const {
            makerPage,
            editorToolsUsageTracking,
            editor
        } = this.props;
        editor.trackToolUsageEvent();
        if (!this.props.itemPageCaptioning.status) {
            uploadObject.saveToolsUsageTracking(editorToolsUsageTracking);
            makerPage.trackEvent({
                eventName: 'editing_done_tap',
                params: {
                    'actions': editorToolsUsageTracking,
                    'category': uploadObject.getOriginalMediaType(),
                },
            });
        }
        const createGif = editor.prepareEditorForGifCreation().then((settings) => {
            if (!this.props.itemPageCaptioning.status) {
                this.context.store.set('ui.GifMakerPage.view', 'tagging');
            }
            return uploadObject.createGifFromFrames(editor, settings);
        });

        createGif.then((gifData) => {
            if (this.props.itemPageCaptioning.status) {
                this.context.router.history.push(this.props.itemPageCaptioning.url);
                dialog.open('caption-share-dialog', {
                    gifData: gifData,
                });
            } else {
                setTimeout(() => {
                    this.props.makerPage.triggerUpdate();
                }, 100);
            }
        }).catch((err) => {
            alert(`Error: ${err.message}`);
        });
    }

    render() {
        const {
            encodingStatus,
            isMobile,
            editor
        } = this.props;
        const gettextSub = this.context.gtService.gettextSub;
        const encodingInProgress = encodingStatus === ITEM_STATES.INPROGRESS;
        const editorReady = editor;

        return ( <
            button disabled = {
                encodingInProgress || !editorReady
            }
            onClick = {
                this.create
            }
            className = "CreateGifButton" >
            {
                encodingInProgress &&
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
                    gettextSub('CREATING GIF')
                } <
                /div>
            } {
                !encodingInProgress && !isMobile && gettextSub('CREATE GIF')
            } {
                !encodingInProgress && isMobile && gettextSub('Create')
            } <
            /button>
        );
    }
}