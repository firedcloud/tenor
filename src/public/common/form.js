import {
    autobind
} from 'core-decorators';

import {
    Component
} from 'inferno'; // eslint-disable-line no-unused-vars


export function createFormState(validators) {
    const ngform = {};
    ngform.validators = validators || {};
    ngform.touched = {};
    ngform.errors = {};
    ngform.apigeneralsuccesses = {};
    ngform.apigeneralsuccessmsg = '';
    ngform.submitted = false;

    ngform.valid = function() {
        return Object.keys(ngform.errors).length === 0;
    };
    ngform.submitDisabled = function() {
        return ngform.submitted || !ngform.valid();
    };

    ngform.touchedInputErrors = function(name) {
        if (ngform.touched[name]) {
            if (ngform.errors[name]) {
                return ngform.errors[name];
            }
        }
        return [];
    };

    ngform.setTouched = function(input) {
        const name = input.name || input;
        ngform.touched[name] = true;
        delete ngform.errors[name];
    };
    ngform.validateInput = function(input) {
        ngform.clearErrorsIfSubmitted();
        const name = input.name;
        const value = input.value;
        const errors = [];

        delete ngform.errors[name];
        if (value.length) {
            if (input.minLength > 0 && input.minLength > value.length) {
                errors.push(`Minimum length is ${input.minLength}.`);
            }
            if (input.maxLength > 0 && input.maxLength < value.length) {
                errors.push(`Maximum length is ${input.maxLength}.`);
            }
            if (input.pattern) {
                if (!new RegExp(input.pattern).test(value)) {
                    errors.push('Please enter a valid value.');
                }
            }
            if (input.type === 'email') {
                if (!/^\w+([.+-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(value)) {
                    errors.push('Please enter a valid email address.');
                }
            }
        } else {
            if (input.required) {
                errors.push('You did not enter a value.');
            }
        }
        if (ngform.validators[name]) {
            const errMsg = ngform.validators[name](value);
            if (errMsg) {
                errors.push(errMsg);
            }
        }
        if (errors.length) {
            ngform.errors[name] = errors;
        }
    };

    ngform.addAPIGeneralSuccess = function(msg) {
        ngform.apigeneralsuccesses.api = true;
        ngform.apigeneralsuccessmsg = msg;
    };

    ngform.addAPIErrors = function(body) {
        let key;
        if (!body || typeof body.error === 'string') {
            key = '';
            ngform.setTouched(key);
            ngform.errors[key] = ngform.errors[key] || [];
            ngform.errors[key].push(body.error || 'Unknown Error, Please try again.');
        } else {
            for (key of Object.keys(body.error)) {
                ngform.setTouched(key);
                ngform.errors[key] = ngform.errors[key] || [];
                ngform.errors[key].push(body.error[key]);
            }
        }
    };

    ngform.clearErrorsIfSubmitted = function() {
        if (ngform.submitted) {
            ngform.errors = {};
            ngform.submitted = false;
        }
    };
    return ngform;
}


export function Messages(props, context) {
    const formState = props.state;
    const name = props.name;
    // Only show errors for touched fields.
    const errors = formState.touchedInputErrors(name);

    const msgs = [];

    for (const error of errors) {
        let msg = error;
        if (name && props.includeNameInError) {
            msg = `${name.slice(0, 1).toUpperCase()}${name.slice(1, name.length)} ${error}`;
        }
        msgs.push( < div > {
                msg
            } < /div>);
        }
        return <div className = {
            `${props.className || ''} errors`
        }
        role = "alert" > {
            msgs
        } < /div>;
    }


    export function MessagesGroup(props, context) {
        const formState = props.state;
        const errorKeys = Object.keys(formState.errors);
        // className={errorKeys.length ? 'errors' : ''}
        return ( <
            div > {
                errorKeys.map((name) => {
                    return <Messages state = {
                        formState
                    }
                    includeNameInError = {
                        true
                    }
                    name = {
                        name
                    }
                    />;
                })
            } <
            /div>
        );
    }


    export class Form extends Component {
        @autobind
        setElement(element) {
            this.element = element;
        }
        render() {
            return ( <
                form ref = {
                    this.setElement
                }
                novalidate = {
                    true
                }
                className = {
                    this.props.className
                }
                name = {
                    this.props.name
                }
                onSubmit = {
                    this.props.onSubmit
                } >
                {
                    this.props.children
                } <
                /form>
            );
        }
    }