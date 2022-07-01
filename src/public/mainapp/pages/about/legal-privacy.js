import {
    Component
} from 'inferno'; // eslint-disable-line no-unused-vars

import {
    Page
} from '../../../common/components';

import './legal.scss';


export class LegalPrivacyPage extends Page {
    pageInit() {
        this.redirect('https://policies.google.com/privacy');
    }
}