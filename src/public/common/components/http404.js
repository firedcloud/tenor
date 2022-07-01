import {
    Component
} from 'inferno'; // eslint-disable-line no-unused-vars

import {
    Page
} from '../../common/components';

import './http404.scss';


export class HTTP404Page extends Page {
    pageInit() {
        this.log('pageInit');
    }
    render() {
        this.context.response.status = 404;
        return super.render();
    }
}