import {
    Component
} from 'inferno'; // eslint-disable-line no-unused-vars


import './FavButton.scss';


export function Icon(props) {
    let {
        name,
        spin,
        className,
        ...otherProps
    } = props;
    if (!className) {
        className = '';
    } else {
        className += ' ';
    }
    className += `iconfont-${name}`;
    if (spin) {
        className += ' iconfont-spin';
    }
    return <span className = {
        className
    }
    aria - hidden = "true" { ...otherProps
    }
    />;
}


export function FavButton(props) {
    let {
        className,
        ...otherProps
    } = props;
    if (!className) {
        className = '';
    } else {
        className += ' ';
    }
    className += 'FavButton';
    return <span className = {
        className
    }
    aria - hidden = "true" { ...otherProps
    }
    />;
}