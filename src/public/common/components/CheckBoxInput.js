import {
    CustomComponent
} from '../components';
import {
    Icon
} from '../components/Icon';

import './CheckBoxInput.scss';

export class CheckBoxInput extends CustomComponent {
    render() {
        const {
            id,
            boxSize,
            checkSize
        } = this.props;

        return ( <
            div className = "CheckBoxInput" >
            <
            label
            for = {
                id
            } >
            <
            input id = {
                id
            }
            type = "checkbox"
            name = {
                this.props.name
            }
            checked = {
                this.props.checked
            }
            onClick = {
                this.props.checkHandler
            }
            style = {
                {
                    width: boxSize,
                    height: boxSize,
                }
            }
            /> <
            span className = "accessibility-label" > {
                this.props.label
            } < /span>

            <
            div className = {
                `stylized-checkbox ${this.props.checked ? 'checked' : ''}`
            }
            style = {
                {
                    width: boxSize,
                    height: boxSize,
                }
            } >
            {
                this.props.checked && < Icon name = "checkmark-thin"
                style = {
                    {
                        fontSize: checkSize
                    }
                }
                />} <
                /div>

                <
                /label> <
                /div>
            );
        }
    }