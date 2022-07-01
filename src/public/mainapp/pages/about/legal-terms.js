import {
    Component
} from 'inferno'; // eslint-disable-line no-unused-vars

import {
    Link,
    Page
} from '../../../common/components';
import {
    Metadata
} from '../../../common/metadata';

import './legal.scss';

export class LegalTermsPage extends Page {
    pageInit() {
        this.title = 'Tenor Terms of Service';
        this.keywords = 'terms of service,about';
    }

    renderPage() {
        const googleTOS = < Link to = "https://policies.google.com/terms?hl=en-US" > Google Terms of Service < /Link>;
        const googlePP = < Link to = "https://policies.google.com/privacy?hl=en-US" > Privacy Policy < /Link>;

        return ( <
            div className = "about-legal container page" >
            <
            Metadata page = {
                this
            }
            /> <
            h1 > {
                this.title
            } < /h1> <
            div >
            <
            Link to = {
                '/legal-terms'
            } > Terms of Service < /Link> {
                ` · `
            } <
            Link to = {
                '/legal-privacy'
            } > Privacy Policy < /Link> <
            /div>

            <
            br / >

            <
            div className = "date" >
            <
            h3 > {
                `Last Updated: March 3, 2021`
            } < /h3> <
            /div>

            <
            p > Tenor includes the Tenor mobile app, Tenor’ s website, located at http: //tenor.com, the Tenor extensions, and the Tenor API. The Tenor
            API may be integrated with third party devices or services, but any Tenor related services are provided by Google. < /p>

            <
            p > To use Tenor, you must accept(1) the {
                googleTOS
            }
            and(2) these Tenor Additional Terms of Service(the & quot; < b > Tenor Additional Terms < /b>&quot;).</p >

                <
                p > Please read each of these documents carefully.Together, these documents are known as the & quot; < b > Terms < /b>&quot;. They establish what you can expect from
                us as you use our services, and what we expect from you. < /p>

                <
                p > If these Tenor Additional Terms conflict with the {
                    googleTOS
                },
                these Additional Terms will govern
                for Tenor. < /p>

                <
                p > Although it’ s not a part of these Terms, we encourage you to read our {
                    googlePP
                }
                to better understand how you can < Link to = "https://account.google.com/" >
                update, manage,
                export, and delete your information < /Link>.</p >

                <
                div className = "legal-terms" >
                <
                div className = "terms-row level-1" >
                <
                div > < b > 1. < /b></div >
                <
                div >
                <
                b > Your Content. < /b> <
                /div> <
                /div>

                <
                div className = "terms-row level-2" >
                <
                div > < /div> <
                span > {
                    `Tenor allows you to submit, store, send, receive, or share your content.
                        Your content is licensed to Google as described in the Google Terms of
                        Service — so if you upload content to Tenor, we may display that content
                        to users and share it when directed, and those users (including users
                        who access content through the Tenor API) may view, share, and modify
                        that content.`
                } <
                /span> <
                /div>

                <
                div className = "terms-row level-1" >
                <
                div > < b > 2. < /b></div >
                <
                div >
                <
                b > Prohibited Content. < /b> <
                /div> <
                /div>

                <
                div className = "terms-row level-2" >
                <
                div > 2.1 < /div> <
                span > {
                    `You must not use Tenor for any commercial purpose or for the
                        benefit of any third party.`
                } <
                /span> <
                /div> <
                div className = "terms-row level-2" >
                <
                div > 2.2 < /div> <
                span > {
                    `As we explain in the Google Terms of Service, we want to maintain
                        a respectful environment for everyone. When using Tenor, you must follow
                        our `
                } <
                Link to = "https://support.google.com/tenor" > Program Policies < /Link> {
                    ` and the basic rules of conduct described in the Google Terms of Services.
                        In particular, when using Tenor, you must not:`
                } < /span> <
                /div>

                <
                div className = "terms-row level-3" >
                <
                div > a. < /div> <
                span > {
                    `submit, store, send, or share any content that:`
                } <
                /span> <
                /div>

                <
                div className = "terms-row level-4" >
                <
                div > i. < /div> <
                span > {
                    `violates, or encourages any conduct that would violate applicable
                        law or others’ rights, including any content that infringes, misappropriates,
                        or violates someone else’s intellectual property rights, or rights of
                        publicity or privacy;`
                } <
                /span> <
                /div> <
                div className = "terms-row level-4" >
                <
                div > ii. < /div> <
                span > {
                    `contains personal or contact information about any other person without their prior authorization;`
                } <
                /span> <
                /div> <
                div className = "terms-row level-4" >
                <
                div > iii. < /div> <
                span > {
                    `promotes illegal or harmful activities or substances;`
                } <
                /span> <
                /div> <
                div className = "terms-row level-4" >
                <
                div > iv. < /div> <
                span > {
                    `is fraudulent, misleading, or deceptive;`
                } <
                /span> <
                /div> <
                div className = "terms-row level-4" >
                <
                div > v. < /div> <
                span > {
                    `is false or defamatory;`
                } <
                /span> <
                /div> <
                div className = "terms-row level-4" >
                <
                div > vi. < /div> <
                span > {
                    `is obscene or pornographic;`
                } <
                /span> <
                /div> <
                div className = "terms-row level-4" >
                <
                div > vii. < /div> <
                span > {
                    `promotes or constitutes discrimination, bigotry, racism, hatred,
                        harassment, or harm against any individual or group;`
                } <
                /span> <
                /div> <
                div className = "terms-row level-4" >
                <
                div > viii. < /div> <
                span > {
                    `is violent or threatening or promotes violence or actions that
                        are threatening to any individual, group, or organization; or`
                } <
                /span> <
                /div>

                <
                div className = "terms-row level-3" >
                <
                div > b. < /div> <
                span > {
                    `send any unsolicited or unauthorized advertising, promotional
                        materials, or communications, including email, mail, spam, chain letters,
                        or other solicitations.`
                } <
                /span> <
                /div> <
                /div> <
                /div>
            );
        }
    }