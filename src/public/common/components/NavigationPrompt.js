import {
    Component
} from 'inferno'; // eslint-disable-line no-unused-vars
import {
    Prompt
} from 'inferno-router';

import {
    discouragePageNavigation
} from '../util';


/**
 * The Prompt element handles navigation events wihtin Inferno/React. discouragePageNavigation
 * tries to handle everything else.
 *
 * Having this present in the virtual DOM, even if props.when is false, will
 * mean discouragePageNavigation takes effect; only application route changes
 * will be allowed.
 */
export class NavigationPrompt extends Component {
    componentDidMount() {
        this.unlisten = discouragePageNavigation();
    }

    componentWillUnmount() {
        this.unlisten && this.unlisten();
    }
    render() {
        return <Prompt when = {
            this.props.when
        }
        message = {
            this.props.message
        }
        />;
    }
}