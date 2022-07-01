import {
    Component
} from 'inferno'; // eslint-disable-line no-unused-vars

import {
    Page
} from '../../common/components';
import {
    Metadata
} from '../../common/metadata';
import {
    window
} from '../../common/util';

import {
    SearchTag
} from '../components/Tag';

import {
    subscribe
} from '../../../replete';


@subscribe({
    reactionTags: ['api.tags.featured'],
})
export class ReactionsPage extends Page {
    pageInit(props) {
        const gettextSub = this.context.gtService.gettextSub;

        this.title = gettextSub('Reaction GIFs ~ The Best GIF Responses to Everything | Tenor');
        this.description = gettextSub('Say more with a Reaction GIF. From Congratulations to OMG, Eye Roll to High Five, and everything in between… Find the perfect animated GIF to show exactly what you mean >>>');
        this.keywords = 'gifs,search gifs,share gifs,memes,reactions';

        window.fbq('track', 'ViewContent', {
            content_name: this.title
        });
    }

    renderPage() {
        const gettextSub = this.context.gtService.gettextSub;

        return ( <
            div className = "ReactionsPage container page" >
            <
            Metadata page = {
                this
            }
            /> <
            h1 > {
                gettextSub('Reaction GIFs')
            } < /h1> <
            div className = "responsive-tag-container" > {
                this.props.reactionTags.tags.map((tag, i) => {
                    const {
                        image,
                        searchterm,
                        name
                    } = tag;
                    return <div key = {
                        searchterm
                    }
                    className = "responsive-tag-wrapper" >
                        <
                        SearchTag searchterm = {
                            searchterm
                        }
                    image = {
                        image
                    }
                    name = {
                        name
                    }
                    /> <
                    /div>;
                })
            } <
            /div> <
            /div>
        );
    }
}