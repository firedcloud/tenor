import {
    Component
} from 'inferno'; // eslint-disable-line no-unused-vars

import {
    CustomComponent,
    Link
} from '../../common/components';

import './FlagDialog.scss';


export class FlagDialog extends CustomComponent {
    render() {
        const gettextSubComponent = this.context.gtService.gettextSubComponent;

        const linkElement = < Link className = "contact"
        onClick = {
            () => {
                this.props.dialog.close();
            }
        }
        to = {
                '/contact?topic=abuse'
            } >
            {
                'support@tenor.com'
            } <
            /Link>;

        return ( <
            div className = "FlagDialog" >
            <
            div className = "message" > {
                gettextSubComponent('Thank you. This item will be reviewed by our team. If you would like to provide additional information, please email us at {linkElement}', {
                    linkElement: linkElement,
                })
            } <
            /div> <
            /div>
        );
    }
}