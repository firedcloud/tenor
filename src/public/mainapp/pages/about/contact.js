import {
    autobind
} from 'core-decorators';

import {
    Component
} from 'inferno'; // eslint-disable-line no-unused-vars

import {
    Link,
    Page
} from '../../../common/components';
import {
    Icon
} from '../../../common/components/Icon';
import {
    CONSTANTS
} from '../../../common/config';
import {
    Metadata
} from '../../../common/metadata';
import {
    window
} from '../../../common/util';

import {
    createFormState
} from '../../../common/form';

import './contact.scss';
require('animate.css/source/fading_entrances/fadeIn.css');


let recaptchaLoaded = false;
let recaptchaAdded = false;


export class ContactPage extends Page {
    pageInit() {
        const gettextSub = this.context.gtService.gettextSub;

        this.title = gettextSub('Contact Us');
        this.keywords = 'contact us,about';

        const query = new URLSearchParams(this.context.router.history.location.search);
        this.preselectedTopic = query.get('topic');
        if (this.preselectedTopic === 'dmca') {
            this.title = gettextSub('Submit a Copyright Complaint');
        }
        this.state = {
            topic: this.preselectedTopic || 'feedback',
            recaptchaValid: false,
        };
        this.state[CONSTANTS.RECAPTCHA_FIELD] = '';

        this.contactForm = createFormState({
            'g-recaptcha-response': function(val) {
                return val.length === 0;
            },
        });

        console.log('recaptchaLoaded', recaptchaLoaded);
        console.log('recaptchaAdded', recaptchaAdded);
        if (process.env.BROWSER) {
            window.recaptchaApiLoaded = () => {
                recaptchaLoaded = true;
                this.triggerUpdate();
            };
            if (!recaptchaAdded) {
                const script = document.createElement('script');
                script.src = 'https://www.google.com/recaptcha/api.js?onload=recaptchaApiLoaded&render=explicit';
                document.body.appendChild(script);
                recaptchaAdded = true;
            }
        }

        const translatedTopicNames = {
            feedback: gettextSub('Site Suggestion'),
            press: gettextSub('Press Inquiry'),
            account: gettextSub('Account Question'),
            general: gettextSub('General Inquiry'),
            termination: gettextSub('Account Termination'),
            abuse: gettextSub('Abuse'),
            dmca: gettextSub('Copyright Infringement'),
        };
        this.topicOptions = CONSTANTS.CONTACT_TOPICS.map((topic) => {
            return <option value = {
                topic.id
            } > {
                translatedTopicNames[topic.id] || topic.name
            } < /option>;
        });
    }

    @autobind
    handleChange(event) {
        const newState = {};
        newState[event.target.name] = event.target.value;
        this.setState(newState);
    }

    @autobind
    submit(event) {
        const gettextSub = this.context.gtService.gettextSub;

        event.preventDefault();
        this.contactForm.validateInput(event.target.elements.topic);
        this.contactForm.validateInput(event.target.elements['g-recaptcha-response']);
        if (!this.contactForm.valid()) {
            alert(gettextSub('Form is invalid'));
            this.triggerUpdate();
            return false;
        }

        const returnMailToLink = true;
        const body = {
            topic: this.state.topic,
            message: this.state.message,
            email: this.state.email,
            [CONSTANTS.RECAPTCHA_FIELD]: event.target.elements['g-recaptcha-response'].value,
            returnMailToLink: returnMailToLink,
            userId: this.context.authService.getId(),
        };
        fetch('/api/contact', {
                method: 'POST',
                headers: {
                    'content-type': 'application/json'
                },
                body: JSON.stringify(body),
            })
            .then((response) => {
                if (response.status === 200) {
                    this.context.apiService.registerEvent('contact_form_submitted');
                    if (returnMailToLink) {
                        response.json().then((contactJson) => {
                            this.setState({
                                contactJson
                            });
                        });
                    } else {
                        response.text().then((text) => {
                            alert(gettextSub('Thanks for your inquiry, we\'ll be in touch soon.'));

                            this.context.router.history.push('/');
                        });
                    }
                    if (this.recaptchaElement) {
                        window.grecaptcha.reset();
                    }
                } else {
                    alert(gettextSub('Could not process contact form, please try again.'));
                }
            }, function() {
                alert(gettextSub('Could not process contact form, please try again.'));
            });
    }
    @autobind
    setRecaptchaElement(element) {
        this.recaptchaElement = element;
        if (element) {
            console.log('element.id', element.id);
            window.grecaptcha.render(element.id, {
                sitekey: CONSTANTS.RECAPTCHA_PUBLIC_KEY,
                callback: this.recaptchaCallback,
            });
        }
    }

    @autobind
    recaptchaCallback() {
        if (this.formEl) {
            this.contactForm.validateInput(this.formEl.elements['g-recaptcha-response']);
            this.triggerUpdate();
        }
    }

    @autobind
    setFormElement(element) {
        this.formEl = element;
    }

    renderPage() {
            const gettextSub = this.context.gtService.gettextSub;
            return ( <
                div className = "ContactPage page" >
                <
                Metadata page = {
                    this
                }
                /> <
                h1 > {
                    this.title
                } < /h1> <
                form name = "contactForm"
                onSubmit = {
                    this.submit
                }
                ref = {
                    this.setFormElement
                } >
                <
                p style = {
                    {
                        display: this.preselectedTopic === 'dmca' ? 'none' : 'block'
                    }
                } >
                <
                label
                for = "id_topic" > Topic < /label><br/ >
                <
                select id = "id_topic"
                name = "topic"
                value = {
                    this.state.topic
                }
                required = {
                    true
                }
                onChange = {
                    this.handleChange
                } >
                {
                    this.topicOptions
                } <
                /select> <
                /p> {
                    recaptchaLoaded && < div id = "recaptcha-element"
                    ref = {
                        this.setRecaptchaElement
                    }
                    />} <
                    p >
                        <
                        input
                    className = "btn-block button"
                    type = "submit"
                    value = {
                        gettextSub('Get contact email address')
                    }
                    disabled = {!this.contactForm.valid()
                    }
                    /> <
                    /p> {
                        this.state.contactJson && < p className = "contact-instructions animated fadeIn" >
                            <
                            Icon name = "email" / > {
                                gettextSub('Please send your email to: ')
                            } <
                            Link to = {
                                this.state.contactJson.href
                            } > {
                                this.state.contactJson.email
                            } < /Link> <
                            /p>} <
                            /form> <
                            /div>
                    );
                }
            }