import {
    autobind
} from 'core-decorators';

import {
    Component
} from 'inferno'; // eslint-disable-line no-unused-vars

import {
    CustomComponent,
    Link
} from '../components';
import {
    OfficialBadge
} from '../../mainapp/components/OfficialBadge';
import {
    Icon
} from './Icon';


function Suggestion({
    idx,
    suggestion,
    searchbar
}) {
    function handleMouseDown() {
        searchbar.handleSearchPerformed(idx);
    }
    const partnerLogo = suggestion.image && < img className = "partner-logo"
    src = {
        suggestion.image
    }
    />;
    const partnerName = suggestion.name;

    return ( <
            Link className = {
                idx === searchbar.state.selectedSuggestionIndex ? 'selected' : ''
            }
            to = {
                suggestion.path
            }
            onMouseDown = {
                handleMouseDown
            } >
            {
                partnerLogo
            } {
                partnerName
            } { < OfficialBadge flags = {
                    suggestion.userflags
                }
                /> } <
                /Link>);
            }


            export class BaseSearchBar extends CustomComponent {
                constructor(props, context) {
                    super(props, context);
                    this.maxSuggestions = 6;
                    this.state.keyPressed = false;
                    this.state.selectedSuggestionIndex = -1;
                    this.handleLocationSet();
                    this.routerUnlisten = this.context.router.history.listen(this.handleLocationSet);

                    const gettextSub = this.context.gtService.gettextSub;

                    this.placeholder = gettextSub('Search');
                }
                componentWillUnmount() {
                    this.routerUnlisten();
                }
                @autobind
                handleLocationSet() {
                    // update input, but only if user isn't currently typing.
                    this.state.value = this.stringToValue(this.pathToString(this.context.router.history.location.pathname));
                    this.triggerUpdate();
                }
                setSuggestions(suggestions) {
                    this.state.selectedSuggestionIndex = -1;
                    this.state.suggestions = suggestions;
                }
                selectSuggestionByOffset(offset) {
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
                cleanInput(s) {
                    return s.toLowerCase().replace(/"/g, '').replace(/[\s,]+/g, ' ').replace(/^\s+/, '');
                }
                stringToValue(s) {
                    return {
                        name: s,
                        path: this.stringToPath(s),
                    };
                }
                @autobind
                handleOnInput(event) {
                    const s = this.cleanInput(event.target.value);
                    this.state.value = this.stringToValue(s);
                    this.triggerUpdate();
                    const reqValue = s.trim();
                    this.fetchSuggestions(reqValue).then(this.triggerUpdate);

                    // Putting this in a setTimeout in needed for IE11 compatibility.
                    // setTimeout(function(){
                    //     that.triggerUpdate();
                    // }, 0);
                }
                @autobind
                handleOnBlur(event) {
                    this.state.focused = false;
                    const that = this;
                    setTimeout(function() {
                        that.triggerUpdate();
                    }, 500);
                }
                @autobind
                handleOnFocus(event) {
                    this.state.focused = true;
                    this.triggerUpdate();
                }
                @autobind
                handleOnKeyDown(event) {
                    this.state.keyPressed = true;
                    if (event.keyCode === 40) {
                        // DOWN Key
                        event.preventDefault();
                        this.selectSuggestionByOffset(1);
                    } else if (event.keyCode === 38) {
                        // UP Key
                        event.preventDefault();
                        this.selectSuggestionByOffset(-1);
                    } else if (event.keyCode === 27) {
                        // ESC Key
                        event.preventDefault();
                        this.state.selectedSuggestionIndex = -1;
                    }
                    this.triggerUpdate();
                }
                @autobind
                setInput(element) {
                    this.input = element;
                }
                @autobind
                focus(event) {
                    this.input.focus();
                }
                @autobind
                handleButtonMouseDown(event) {
                    if (this.state.focused) {
                        // perform search
                        this.handleSubmit();
                    } else {
                        this.focus();
                    }
                }
                @autobind
                handleSubmit(event) {
                    event && event.preventDefault();
                    this.input.blur();
                    let val;
                    if (this.state.selectedSuggestionIndex === -1) {
                        val = this.state.value;
                    } else {
                        val = this.state.suggestions[this.state.selectedSuggestionIndex];
                    }
                    this.context.router.history.push(val.path);
                    this.handleSearchPerformed(val.name.trim());
                }
                @autobind
                handleSearchPerformed(val) {

                }
                render() {
                        const suggestionEls = [];
                        for (const e of (this.state.suggestions || []).slice(0, this.maxSuggestions).entries()) {
                            suggestionEls.push( < Suggestion idx = {
                                    e[0]
                                }
                                suggestion = {
                                    e[1]
                                }
                                searchbar = {
                                    this
                                }
                                />);
                            }

                            return ( < form className = "SearchBar"
                                onSubmit = {
                                    this.handleSubmit
                                } >
                                <
                                input ref = {
                                    this.setInput
                                }
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
                                name = "q"
                                value = {
                                    this.state.value.name
                                }
                                placeholder = {
                                    this.placeholder
                                }
                                autocomplete = "off" /
                                >
                                <
                                Icon name = "search"
                                onMouseDown = {
                                    this.handleButtonMouseDown
                                }
                                /> {
                                    this.state.focused && this.state.keyPressed && suggestionEls.length > 0 && < div className = "suggestions" > {
                                            suggestionEls
                                        } < /div> } <
                                        /form>);
                                }
                            }