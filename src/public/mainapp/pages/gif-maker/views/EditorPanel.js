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
    iOS
} from '../../../../common/util/isMobile';
import {
    TrimmingTools
} from '../components/Trimming';
import {
    CreateGifButton
} from '../components/CreateGifButton';
import {
    CaptioningTools
} from '../components/Captioning';
import {
    CroppingTools
} from '../components/Cropping';
import {
    Icon
} from '../../../../common/components/Icon';
import {
    subscribe
} from '../../../../../replete';
import './EditorPanel.scss';

@subscribe({
    isMobile: ['ui.isMobile'],

    makerPage: ['ui.GifMakerPage.makerPage'],
    itemPageCaptioning: ['ui.GifMakerPage.itemPageCaptioning'],
    queueIdx: ['ui.GifMakerPage.queueIdx'],

    editor: ['ui.GifEditor.editor'],
    encodingStatus: ['ui.GifEditor.encodingStatus'],
    editorBoundingRect: ['ui.GifEditor.editorBoundingRect'],
    trimData: ['ui.GifEditor.trimData'],
    captionData: ['ui.GifEditor.captionData'],
    tool: ['ui.GifEditor.tool'],
})
export class EditorPanel extends CustomComponent {
    constructor(props, context) {
        super(props, context);

        let toolSettingsState = {
            showToolSelectors: false,
            captioningEnabled: false,
            croppingEnabled: false,
            trimmingEnabled: false,
        };

        if (props.itemPageCaptioning.status) {
            toolSettingsState = Object.assign(toolSettingsState, {
                captioningEnabled: true,
            });
        } else {
            toolSettingsState = Object.assign(toolSettingsState, {
                showToolSelectors: true,
                captioningEnabled: true,
                croppingEnabled: true,
                trimmingEnabled: true,
            });
        }

        this.state = Object.assign(
            toolSettingsState, {
                tempProgress: 0
            },
        );
        this.iOS = iOS();
    }

    componentDidMount() {
        if (!this.props.tool) {
            this.props.itemPageCaptioning.status ? this.switchTo('captioning') : this.switchTo('trimming');
        }
    }

    @autobind
    switchTo(tool) {
        if (!this.props.editor) { // FIXME HACK
            window.setTimeout(() => {
                this.switchTo(tool);
            }, 10);
            return;
        }
        this.props.editor.switchTo(tool);
    }

    renderToolSelectorButtons() {
        const {
            tool,
            editor,
            makerPage,
            queue,
            queueIdx
        } = this.props;
        const uploadObject = queue[queueIdx];
        const editorReady = editor;

        if (this.state.showToolSelectors) {
            return ( <
                div className = "tool-selector-buttons" >

                <
                button className = {
                    `selector ${tool === 'trimming' ? 'selected' : ''}`
                }
                onClick = {
                    () => {
                        editor.trackToolUsageEvent();
                        makerPage.trackEvent({
                            eventName: 'editing_trim_tap',
                            params: {
                                'category': uploadObject.getOriginalMediaType(),
                            },
                        });
                        this.switchTo('trimming');
                    }
                }
                disabled = {!editorReady
                } >
                <
                Icon name = "trim-icon" / >
                <
                div className = "selection-indicator" / >
                <
                /button>

                <
                button className = {
                    `selector ${tool === 'cropping' ? 'selected' : ''}`
                }
                onClick = {
                    () => {
                        editor.trackToolUsageEvent();
                        makerPage.trackEvent({
                            eventName: 'editing_crop_tap',
                            params: {
                                'category': uploadObject.getOriginalMediaType(),
                            },
                        });
                        this.switchTo('cropping');
                    }
                }
                disabled = {!editorReady
                } >
                <
                Icon name = 'crop-icon' / >
                <
                div className = "selection-indicator" / >
                <
                /button>

                <
                button className = {
                    `selector ${tool === 'captioning' ? 'selected' : ''}`
                }
                onClick = {
                    () => {
                        editor.trackToolUsageEvent();
                        makerPage.trackEvent({
                            eventName: 'editing_caption_tap',
                            params: {
                                'category': uploadObject.getOriginalMediaType(),
                            },
                        });
                        this.switchTo('captioning');
                    }
                }
                disabled = {!editorReady
                } >
                <
                Icon name = "caption-icon" / >
                <
                div className = "selection-indicator" / >
                <
                /button>

                <
                /div>
            );
        } else {
            return <div / > ;
        }
    }

    render() {
            const editorReady = this.props.editor;

            return ( <
                    div className = "EditorPanel" > {!this.props.isMobile && this.renderToolSelectorButtons()
                    }

                    <
                    div className = "editor-box" >
                    <
                    div className = {
                        `tools-section ${this.iOS && this.props.tool === 'trimming' ? 'ios-swipe-padding-fix' : ''}`
                    } > {
                        editorReady && this.props.tool === 'trimming' && < TrimmingTools queue = {
                            this.props.queue
                        }
                        />} {
                            editorReady && this.props.tool === 'cropping' && < CroppingTools queue = {
                                this.props.queue
                            }
                            /> } {
                                editorReady && this.props.tool === 'captioning' && < CaptioningTools queue = {
                                    this.props.queue
                                }
                                /> } <
                                /div>

                                {
                                    !this.props.isMobile &&
                                        <
                                        div className = "create-button-section" >
                                        <
                                        CreateGifButton queue = {
                                            this.props.queue
                                        }
                                    /> <
                                    /div>
                                } <
                                /div>

                                {
                                    this.props.isMobile && this.renderToolSelectorButtons()
                                } <
                                /div>
                            );
                        }
                    }