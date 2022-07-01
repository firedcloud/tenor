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
    subscribe
} from '../../../../../replete';
import {
    ITEM_STATES
} from '../constants';
import {
    KEY
} from '../../../../common/constants';
import {
    iOS
} from '../../../../common/util/isMobile';

function Suggestion({
    idx,
    suggestion,
    tagSearchBox
}, context) {
    const gettextSub = context.gtService.gettextSub;

    function highlighted() {
        return idx === tagSearchBox.state.selectedSuggestionIndex;
    }

    function handleMouseOver(event) {
        tagSearchBox.selectSuggestionByMouseOver(event, idx);
    }

    return ( <
        div className = {
            `tag-suggestion-item${highlighted() ? ' selected' : ''}`
        }
        onMouseOver = {
            tagSearchBox.props.isMobile ? '' : handleMouseOver
        } // NOTE iOS interprets a first tap event as mouseover, requiring two taps to fire button onClick
        >
        <
        button className = "tag-suggestion-term"
        onClick = {
            (e) => tagSearchBox.handleTagSelect(e, idx)
        } >
        {
            suggestion
        } <
        /button>

        {
            highlighted() && tagSearchBox.isMultipleGifUpload() &&
                <
                button
            className = {
                `tag-suggestion-apply-all-button ${tagSearchBox.state.applyTagToAll ? ' selected' : ''}`
            }
            onClick = {
                    (e) => tagSearchBox.handleTagSelectAll(e, idx)
                } >
                {
                    gettextSub('Add to All')
                } <
                /button>
        } <
        /div>
    );
}

@subscribe({
    isMobile: ['ui.isMobile'],
    makerPage: ['ui.GifMakerPage.makerPage'],
})
export class TagSearchBox extends CustomComponent {
    constructor(props, context) {
        super(props, context);
        this.maxSuggestions = 5;
        this.state = {
            selectedSuggestionIndex: -1,
            applyTagToAll: false,
            value: '',
            dropdownEnabled: false,
        };
        this.iOS = iOS();
    }

    componentDidMount() {
        if (!this.props.isMobile && this.props.idx === 0 && this.props.uploadObject.uploadStatus !== ITEM_STATES.DONE) {
            this.focus();
        }
    }

    fetchSuggestions(reqValue) {
        return this.context.apiService.getAutocompleteResults(reqValue)
            .then(([body]) => {
                // only update suggestions if search term === current search term
                if (reqValue === this.state.value.trim()) {
                    const suggestions = [];
                    for (const item of (body.results || [])) {
                        suggestions.push(item);
                    }
                    this.setSuggestions(suggestions);
                }
            });
    }

    setSuggestions(suggestions) {
        this.state.selectedSuggestionIndex = -1;
        this.state.suggestions = suggestions;
        this.triggerUpdate();
    }
    selectSuggestionByOffset(offset) {
        this.state.applyTagToAll = false;
        let numSuggestions = (this.state.suggestions || []).length;
        if (numSuggestions) {
            if (numSuggestions > this.maxSuggestions) {
                numSuggestions = this.maxSuggestions;
            }
            this.state.selectedSuggestionIndex = this.state.selectedSuggestionIndex + offset;
            if (this.state.selectedSuggestionIndex >= numSuggestions) {
                this.state.selectedSuggestionIndex = -1;
            } else if (this.state.selectedSuggestionIndex < -1) {
                this.state.selectedSuggestionIndex = numSuggestions - 1;
            }
        }
    }
    selectSuggestionByMouseOver(event, idx) {
        let applyTagToAll;
        if (event.target.className === 'tag-suggestion-apply-all-button') {
            applyTagToAll = true;
        } else {
            applyTagToAll = false;
        }
        this.setState({
            selectedSuggestionIndex: idx,
            applyTagToAll,
        });
    }
    cleanInput(s) {
        return s.replace(/['"-.]/g, '').replace(/[\s,]+/g, ' ');
    }
    @autobind
    handleOnInput(event) {
        event.preventDefault();
        const s = this.cleanInput(event.target.value);
        this.setState({
            value: s
        });
        const reqValue = s.trim();
        this.fetchSuggestions(reqValue).then(this.triggerUpdate);
    }
    @autobind
    handleOnKeyDown(event) {
        this.state.dropdownEnabled = true;

        switch (event.keyCode) {
            case KEY.LEFT:
                event.preventDefault();
                this.state.applyTagToAll = false;
                break;
            case KEY.RIGHT:
                event.preventDefault();
                this.state.applyTagToAll = true;
                break;
            case KEY.UP:
                event.preventDefault();
                this.selectSuggestionByOffset(-1);
                break;
            case KEY.DOWN:
                event.preventDefault();
                this.selectSuggestionByOffset(1);
                break;
            case KEY.ENTER:
                event.preventDefault();
                this.createTag(event, null);
                break;
            case KEY.ESC:
                event.preventDefault();
                this.state.selectedSuggestionIndex = -1;
                break;
            default:
                return;
        }
        this.triggerUpdate();
    }
    @autobind
    handlePaste(event) {
        event.preventDefault();
        let tags = event.clipboardData.getData('Text');
        tags = tags.split(/[,;#]/);
        this.createTag(null, tags);
    }

    // NOTE onBlur fires before onInput/onClick so we need to prevent blur actions until
    // other actions can be completed (eg. suggestion click, add tag click, etc)
    @autobind
    handleOnBlur(event) {
        this.state.allowTagCreationOnInputBlur = true;
        setTimeout(() => {
            if (this.state.allowTagCreationOnInputBlur) {
                this.createTag(null, [this.state.value]);
                this.setState({
                    focused: false,
                    dropdownEnabled: false,
                });
            } else {
                this.state.allowTagCreationOnInputBlur = true;
                this.state.focused = true;
            }
        }, 200); // NOTE allows time for suggestion selection to register
    }

    @autobind
    clearSuggestionSelection() {
        this.setState({
            selectedSuggestionIndex: -1
        });
    }

    @autobind
    handleOnFocus(event) {
        this.scrollInputIntoView();
        this.focus();
    }

    @autobind
    scrollInputIntoView() {
        if (this.props.isMobile && !this.state.focused) {
            // NOTE HACK Android fix: Timeout allows for keyboard to open before scrolling.
            // This is needed for the last tag input field because it is near the bottom of the page
            // and would not otherwise scroll to the top the page.
            const timeout = (this.iOS ? 0 : 200);
            setTimeout(() => {
                const inputPageOffset = this.input.getBoundingClientRect().top + window.pageYOffset;
                const topOffset = 40;
                window.scrollTo({
                    left: 0,
                    top: inputPageOffset - topOffset,
                    behavior: 'smooth',
                });
            }, timeout);
        }
    }
    @autobind
    setInputElement(element) {
        this.input = element;
    }
    @autobind
    focus() {
        this.input.focus();
        this.setState({
            focused: true
        });
    }
    @autobind
    blur() {
        this.input.blur();
    }

    @autobind
    handleTagSelect(event, idx) {
        this.state.selectedSuggestionIndex = idx;
        this.state.allowTagCreationOnInputBlur = false;
        this.createTag(event, null);
    }

    @autobind
    handleTagSelectAll(event, idx) {
        this.state.selectedSuggestionIndex = idx;
        this.state.allowTagCreationOnInputBlur = false;
        this.state.applyTagToAll = true;
        this.createTag(event, null);
    }

    @autobind
    createTag(event, tags) {
        event && event.preventDefault();
        if (!tags) {
            if (this.state.selectedSuggestionIndex >= 0) {
                tags = [this.state.suggestions[this.state.selectedSuggestionIndex]];
            } else {
                tags = [this.state.value];
            }
        }
        tags = tags.map(this.cleanTag);
        tags = tags.filter((tag) => tag.length > 1);
        if (!tags.length) {
            return;
        }

        tags.forEach((tag) => {
            if (this.state.applyTagToAll) {
                this.props.taggingView.addTag(tag);
            } else {
                this.props.taggingView.addTag(tag, this.props.uploadObject);
            }
        });

        this.setState({
            value: '',
            suggestions: [],
            applyTagToAll: false,
            dropdownEnabled: false,
        });
        event && this.focus(); // NOTE allows for input re-focus when clicking tag suggestion
    }

    @autobind
    cleanTag(tag) {
        if (!tag) {
            return '';
        }
        tag = tag.trim();
        const phrase = tag.split(' ');
        if (phrase.length > 1) {
            tag = phrase.map((word) => {
                return word.replace(/^[a-z]/, (v) => {
                    return v.toUpperCase();
                });
            }).join('');
        }
        return tag;
    }
    @autobind
    placeholder() {
        const gettextSub = this.context.gtService.gettextSub;

        if (this.props.uploadObject.tags.length) {
            return gettextSub('Add More Tags');
        } else {
            return gettextSub('Add Tags (minimum 1)');
        }
    }
    isMultipleGifUpload() {
        return this.props.queue.length > 1;
    }

    renderSuggestionDropDown() {
        const gettextSub = this.context.gtService.gettextSub;
        const text = this.state.value;
        const suggestions = this.state.suggestions || [];
        const suggestionList = suggestions.slice(0, this.maxSuggestions).map((suggestion, i) => {
            return <Suggestion key = {
                suggestion
            }
            idx = {
                i
            }
            suggestion = {
                suggestion
            }
            tagSearchBox = {
                this
            }
            />;
        });
        let suggestionListHeader;
        if (text.length > 0) {
            suggestionListHeader = < div className = "suggestion-list-header" > {
                gettextSub('SUGGESTED TAGS')
            } < /div>;
        } else if (!text.length) {
            suggestionListHeader = < div className = "suggestion-list-header" > {
                gettextSub('FEATURED TAGS')
            } < /div>;
        }

        return ( <
            div className = "dropdown" > {
                suggestions.length > 0 &&
                <
                div className = "tag-suggestion-list" > {
                    suggestionListHeader
                } {
                    suggestionList
                } <
                /div>
            } {
                text.length > 1 &&
                    <
                    button
                className = "dropdown-add-tag"
                onClick = {
                    this.handleTagSelect
                }
                onMouseOver = {
                        this.clearSuggestionSelection
                    } >
                    <
                    div className = "text" >
                    <
                    div > {
                        gettextSub('Add')
                    } < /div> <
                    div > {
                        `${text}`
                    } < /div> <
                    /div> <
                    /button>
            } <
            /div>
        );
    }

    render() {
        const gettextSub = this.context.gtService.gettextSub;
        const text = this.state.value;

        return <div className = "TagSearchBox" >
            <
            div className = "tag-input-wrapper" >
            <
            input
        ref = {
            this.setInputElement
        }
        id = {
            `upload_tags_${this.props.idx}`
        }
        className = "tag-input"
        onInput = {
            this.handleOnInput
        }
        onBlur = {
            this.handleOnBlur
        }
        onFocus = {
            this.handleOnFocus
        }
        onKeyDown = {
            this.handleOnKeyDown
        }
        onMouseOver = {
            this.clearSuggestionSelection
        }
        onPaste = {
            this.handlePaste
        }
        value = {
            text
        }
        placeholder = {
            this.placeholder()
        }
        spellcheck = "false"
        // NOTE When a user creates a tag, the html input is cleared
        // but value stored in the ios keyboard is not.
        // If the user starts typing a new tag, the keyboard will append
        // that text to the already created tag when suggesting an "autocorrect"
        // value. The only effective method I found for resetting the
        // keyboard value was to blur the input -- this creates other
        // issues wrt scrolling and keyboard collapsing/reappearing.
        autocorrect = {
            this.iOS ? 'off' : 'on'
        }
        autocapitalize = "off"
        autocomplete = "off" /
            > {
                (this.isMultipleGifUpload() && text && text.length >= 2 && this.state.selectedSuggestionIndex < 0) &&
                <
                button className = {
                    `tag-input-apply-all-button ${this.state.applyTagToAll ? ' selected' : ''}`
                }
                onClick = {
                    this.handleTagSelectAll
                } > {
                    gettextSub('Add to All')
                } <
                /button>
            } <
            /div> {
                this.state.dropdownEnabled && this.state.focused && this.renderSuggestionDropDown()
            } <
            /div>;
    }
}