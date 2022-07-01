import {
    Component
} from 'inferno'; // eslint-disable-line no-unused-vars

import {
    Link
} from '../../common/components';

import './GifRestrictedMessage.scss';


export function GifRestrictedMessage(props) {
    const style = {};
    if (props.width) {
        style.width = props.width;
    }
    if (props.height) {
        style.height = props.height;
    }

    return <div className = "GifRestrictedMessage"
    style = {
            style
        } >
        <
        p className = "header" > Content Unavailable < /p> <
        p className = "msg" > Sorry, this content is not available in your location. < /p> <
        Link to = 'https://support.google.com/tenor'
    external = {
        true
    } > Visit our Help Center
    for more details < /Link> <
        /div>;
}