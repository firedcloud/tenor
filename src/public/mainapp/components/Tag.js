import {
    Component
} from 'inferno'; // eslint-disable-line no-unused-vars

import {
    CustomComponent,
    Link
} from '../../common/components';

import './Tag.scss';

const TAG_COLORS = [
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


export class SearchTag extends CustomComponent {
    render() {
        const {
            image,
            url,
            name,
            searchterm
        } = this.props;
        // const term = name || searchterm;
        // const color = TAG_COLORS[(searchterm.charCodeAt(term.length - 1) + term.charCodeAt(0)) % TAG_COLORS.length];
        return ( <
            Link to = {
                url || this.linkToSearch(searchterm.split(' '))
            }
            className = "SearchTag"
            style = {
                {
                    backgroundImage: `linear-gradient(rgba(23,23,23,0.5), rgba(23,23,23,0.5)), url('${image}')`,
                }
            } >
            <
            span > {
                name || searchterm
            } < /span> <
            /Link>
        );
    }
}

export class RelatedTag extends CustomComponent {
    render() {
        const {
            url,
            name,
            searchterm,
            onClick
        } = this.props;
        const color = TAG_COLORS[(searchterm.charCodeAt(searchterm.length - 1) + searchterm.charCodeAt(0)) % TAG_COLORS.length];
        return ( <
            Link to = {
                url || this.linkToSearch(searchterm.split(' '))
            }
            onClick = {
                onClick
            } >
            <
            div className = "RelatedTag"
            style = {
                {
                    backgroundColor: color,
                }
            } >
            {
                name || searchterm
            } <
            /div> <
            /Link>
        );
    }
}

export class TrendsTag extends CustomComponent {
    render() {
        const {
            tag
        } = this.props;
        let percentChange = tag.percent_change || 0;
        const pos = percentChange > 0;
        const arrow = pos ? '\u2b06' : '\u2b07';
        percentChange = Math.ceil(Math.abs(percentChange));
        return ( <
            div className = "TrendsTag" >
            <
            Link to = {
                this.linkToSearch(tag.searchterm)
            } >
            <
            div className = "img"
            style = {
                {
                    backgroundImage: `url(${tag.image})`
                }
            }
            /> <
            div className = "info" >
            <
            span className = "searchterm" > {
                tag.searchterm
            } < /span> {
                pos && < span className = {
                        `percentage-change ${pos ? 'positive' : 'negative'}`
                    } > {
                        arrow
                    } {
                        percentChange
                    } % < /span>} <
                    /div> <
                    /Link> <
                    /div>
            );
        }
    }