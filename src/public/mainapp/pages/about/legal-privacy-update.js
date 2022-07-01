import {
    Component
} from 'inferno'; // eslint-disable-line no-unused-vars

import {
    Page
} from '../../../common/components';
import {
    fullURL
} from '../../../common/util';

export class LegalPrivacyUpdateRedirect extends Page {
    pageInit() {
        this.redirect(fullURL('/legal-privacy'));
    }
}