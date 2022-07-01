import {
    autobind
} from 'core-decorators';
import clone from 'clone';

import Inferno from 'inferno'; // eslint-disable-line no-unused-vars

import {
    CustomComponent
} from '../../common/components';
import {
    createFormState,
    Form
} from '../../common/form';
import {
    Icon
} from '../../common/components/Icon';
import authService from '../../common/services/authService';
import {
    window
} from '../../common/util';

import {
    subscribe,
    transformProps
} from '../../../replete';

require('./EditProfileDialog.scss');


@transformProps((props) => {
    props.username = authService.getUsername();

    return props;
})
@subscribe({
    profile: ['api.profiles.*', 'username'],
})
export class EditProfileDialog extends CustomComponent {
    constructor(props, context) {
        super(props, context);
        this.formName = 'editPageForm';
        this.form = createFormState();
        this.state = {
            profileDataFetched: false,
            submitted: false,
        };
        this.socialAccountTypes = [
            'Facebook',
            'Instagram',
            'Twitter',
            'Youtube',
            'Other',
        ];
        this.socialAccountIcons = {
            'Facebook': 'facebook',
            'Instagram': 'instagram',
            'Twitter': 'twitter',
            'Youtube': 'youtube',
            'Other': 'link',
        };
        this.username = context.authService.getUsername();
        this.isPartner = authService.userHasFlag('partner');
        this.fieldsChanged = {};
        this.handleProfileBody(props);
    }
    componentWillUpdate(nextProps) {
        if (this.props.profile.pending !== nextProps.profile.pending) {
            this.handleProfileBody(nextProps);
        }
    }
    handleProfileBody(props) {
        this.profile = props.profile.user;
        const {
            partnername,
            tagline,
            partnercta,
            partnerlinks
        } = this.profile;

        this.setState({
            partnername,
            tagline,
            partnercta: partnercta ? clone(partnercta) : {
                url: '',
                text: ''
            },
            partnerlinks: clone(partnerlinks),
            profileDataFetched: true,
        });
    }
    @autobind
    handleInput(e) {
        const name = e.target.name;
        const value = e.target.value;

        if (name.split('-')[0] === 'partnercta') {
            const partnercta = clone(this.state.partnercta);
            partnercta[name.split('-')[1]] = value;
            this.setState({
                partnercta
            });
            this.trackFieldChange('cta');
        } else if (this.socialAccountTypes.includes(name)) {
            const partnerlinks = clone(this.state.partnerlinks);
            partnerlinks.forEach((account) => {
                if (account.tooltip === name) {
                    account.url = value;
                }
            });
            this.setState({
                partnerlinks
            });
            this.trackFieldChange('social-account');
        } else {
            const newState = {};
            newState[name] = value;
            this.setState(newState);
            this.trackFieldChange(name);
        }
    }

    @autobind
    save(e) {
        e.preventDefault();
        this.setState({
            submitted: true
        });
        this.trackEvent('edit_profile_completed');

        const promise1 = this.isPartner ? this.uploadBannerImage() : Promise.resolve();
        // NOTE: partnerapi handles tagline updates, so no need to duplicate
        const promise2 = this.isPartner ? this.uploadAvatar() : this.uploadAvatarAndTagline();
        const promise3 = this.isPartner ? this.uploadProfileTextAssets() : Promise.resolve();

        // TODO add error response handling
        Promise.all([promise1, promise2, promise3]).then((response) => {
            /* HACK NOTE: If we try to call refreshProfile() immediately after
            the promises resolve, the profile updates often have not had enough
            time to propagate to the user db object. Setting a 500ms delay should
            be enough time to ensure the data has propagated while not impacting
            the user experience.*/
            setTimeout(() => {
                this.props.dialog.close();
                this.refreshProfile();
                if (this.linkToProfile() !== window.location.pathname) {
                    this.context.router.history.push(this.linkToProfile());
                }
            }, 500);
        });
    }

    refreshProfile() {
        // This will trigger a new fetch which will overwrite the current value.
        // TODO: We should standardize a refresh method for DataSources.
        this.context.store.call('api.profiles.*', [this.username], 'getInitial');
    }
    @autobind
    trackFieldChange(field) {
        const fieldIDs = {
            'banner': 'ban',
            'cta': 'cta',
            'partnername': 'name',
            'avatar': 'av',
            'social-account': 'soc',
            'tagline': 'bio',
        };
        const id = fieldIDs[field] || 'na';
        this.fieldsChanged[id] = true;
    }

    trackEvent(eventName) {
        const params = {
            tag: this.isPartner ? 'partner' : 'user',
            info: Object.keys(this.fieldsChanged).join('_'),
        };
        this.context.apiService.registerEvent(eventName, params);
    }

    @autobind
    uploadBannerImage() {
        if (this.state.bannerFile) {
            const formData = new FormData();
            formData.append('keyboardid', this.profile.userid);
            formData.append('file', this.state.bannerFile, this.state.bannerFile.name.toLowerCase());

            return this.context.apiService.setBanner(formData)
                .then(([body]) => {
                    const object = {
                        banner: body.url,
                    };
                    return Promise.resolve(object);
                }, (error) => {
                    console.error('save errors', error);
                });
        } else {
            return Promise.resolve();
        }
    }
    @autobind
    uploadAvatar() {
        if (this.state.avatarFile) {
            return this.uploadAvatarAndTagline(true);
        } else {
            return Promise.resolve();
        }
    }
    @autobind
    uploadAvatarAndTagline(avatarUploadOnly) {
        return this.context.apiService.setAvatarAndTagline({
            userid: this.profile.userid,
            avatarImgFile: this.state.avatarFile,
            tagline: avatarUploadOnly ? undefined : this.state.tagline,
        }).catch((error) => {
            console.error('save errors', error);
        });
    }
    uploadProfileTextAssets() {
        const method = 'PUT';
        const path = `/profile/${this.username}`;
        const object = this.createSaveObject();
        console.log('uploadProfileTextAssets', JSON.stringify(object));

        return this.context.apiService.partnerAPI(method, path, null, object)
            .then(({
                body
            }) => {
                console.error('save success', body);
                return Promise.resolve(body);
            }, (error) => {
                console.error('save errors', error);
            });
    }
    createSaveObject() {
        const object = {};
        const saveFields = ['partnername', 'tagline', 'partnercta', 'partnerlinks'];
        for (const field of saveFields) {
            if (field === 'partnerlinks') {
                object[field] = this.state.partnerlinks.filter((link) => {
                    link.url = this.cleanUrl(link.url);
                    return link.url.length;
                });
            } else if (field == 'partnercta') {
                const text = this.state.partnercta.text;
                const url = this.cleanUrl(this.state.partnercta.url);
                object[field] = url ? {
                    text,
                    url
                } : {};
            } else {
                object[field] = this.state[field];
            }
        }
        return clone(object);
    }
    @autobind
    handleUrlInputBlur(e) {
        const url = this.cleanUrl(e.target.value);
        e.target.value = url;
        this.handleInput(e);
    }
    cleanUrl(url) {
        if (!url) {
            return '';
        }
        url = url.replace(/\s/g, '');
        if (url.length && !url.match(/^http[s]?:\/\//i)) {
            url = 'https://'.concat(url);
        }
        return url;
    }
    @autobind
    addAccount(event) {
        const partnerlinks = clone(this.state.partnerlinks);
        partnerlinks.push({
            icon: this.socialAccountIcons[event.target.value],
            url: '',
            tooltip: event.target.value,
        });
        this.setState({
            accountSelected: event.target.value,
            partnerlinks,
        });
        this.resetSocialSelector();
    }
    resetSocialSelector() {
        document.getElementById('social-account-dropdown').selectedIndex = 0;
    }
    @autobind
    removeAccountItem(accountName) {
        let partnerlinks = clone(this.state.partnerlinks);
        partnerlinks = partnerlinks.filter((link) => {
            return link.tooltip !== accountName;
        });
        this.setState({
            partnerlinks,
        });
        this.resetSocialSelector();
    }

    renderUsernameField() {
        const gettextSub = this.context.gtService.gettextSub;

        return ( <
            div >
            <
            label
            for = 'partnername' > {
                gettextSub(`Display Name`)
            } <
            input name = 'partnername'
            type = 'text'
            autocomplete = 'off'
            placeholder = {
                gettextSub('How your name appears on Tenor')
            }
            value = {
                this.state.partnername
            }
            disabled = {
                this.state.submitted
            }
            onInput = {
                this.handleInput
            } >
            <
            /input> <
            /label> <
            /div>
        );
    }

    renderTaglineField() {
        const gettextSub = this.context.gtService.gettextSub;

        return ( <
            label
            for = 'tagline' > {
                gettextSub(`Bio`)
            } <
            input name = 'tagline'
            type = 'text'
            autocomplete = 'off'
            placeholder = {
                gettextSub('55 characters about you')
            }
            value = {
                this.state.tagline
            }
            disabled = {
                this.state.submitted
            }
            onInput = {
                this.handleInput
            } >
            <
            /input> <
            /label>
        );
    }

    renderSocialSelector() {
        const gettextSub = this.context.gtService.gettextSub;

        return ( <
            div >
            <
            label className = "social-selector" > {
                gettextSub(`Social Accounts`)
            } <
            div className = "dropdown-wrapper" >
            <
            select id = 'social-account-dropdown'
            name = 'account'
            value = {
                this.state.accountSelected
            }
            disabled = {
                this.state.submitted
            }
            onChange = {
                this.addAccount
            } >
            <
            option value = ""
            disabled = {
                true
            }
            selected = {
                true
            } > {
                gettextSub('Select account')
            } < /option> {
                this.socialAccountTypes.map((accountName) => {
                    const isDisabled = (this.state.partnerlinks && this.state.partnerlinks.find((link) => {
                        return link.tooltip === accountName;
                    }));
                    return ( <
                        option value = {
                            accountName
                        }
                        disabled = {
                            isDisabled
                        } > {
                            accountName
                        } < /option>
                    );
                })
            } <
            /select> <
            Icon name = "chevron-down" / >
            <
            /div> <
            /label>

            <
            div className = "social-accounts" > {
                this.state.partnerlinks && this.state.partnerlinks.map((account) => {
                    return ( <
                        div className = "social-account" >
                        <
                        Icon name = {
                            'remove-circle'
                        }
                        onClick = {
                            () => {
                                this.trackFieldChange('social-account');
                                this.removeAccountItem(account.tooltip);
                            }
                        }
                        /> <
                        div className = "social-icon"
                        style = {
                            {
                                backgroundImage: `url('/assets/img/icons/brandedPartner/${account.icon}.svg')`,
                            }
                        }
                        /> <
                        input name = {
                            account.tooltip
                        }
                        type = 'url'
                        autocomplete = 'off'
                        value = {
                            account.url
                        }
                        disabled = {
                            this.state.submitted
                        }
                        onInput = {
                            this.handleInput
                        }
                        onBlur = {
                            this.handleUrlInputBlur
                        }
                        placeholder = {
                            `${account.tooltip} URL`
                        }
                        /> <
                        /div>
                    );
                })
            } <
            /div> <
            /div>
        );
    }

    renderCTASelection() {
        const gettextSub = this.context.gtService.gettextSub;

        return ( <
            div >
            <
            label
            for = 'link' > {
                gettextSub(`Link`)
            } <
            input name = 'partnercta-url'
            type = 'text'
            autocomplete = 'off'
            placeholder = {
                gettextSub('URL to your website')
            }
            value = {
                this.state.partnercta.url
            }
            disabled = {
                this.state.submitted
            }
            onInput = {
                this.handleInput
            }
            onBlur = {
                this.handleUrlInputBlur
            } >
            <
            /input> <
            input name = 'partnercta-text'
            type = 'text'
            autocomplete = 'off'
            placeholder = {
                gettextSub('Button text')
            }
            value = {
                this.state.partnercta.text
            }
            disabled = {
                this.state.submitted
            }
            onInput = {
                this.handleInput
            } >
            <
            /input> <
            /label> <
            /div>
        );
    }

    render() {
        const gettextSub = this.context.gtService.gettextSub;

        if (!this.state.profileDataFetched) {
            return ( <
                div id = 'edit-profile-dialog'
                className = 'loading' >
                <
                Icon name = "spinner"
                spin = {
                    true
                }
                /> <
                /div>
            );
        }
        return ( <
            div id = 'edit-profile-dialog' >
            <
            div className = "form-heading" > {
                gettextSub('Edit Profile')
            } < /div> <
            Form > {
                this.isPartner && this.renderUsernameField()
            }

            {
                this.renderTaglineField()
            }

            {
                this.isPartner && this.renderCTASelection()
            }

            <
            ImageInputDropZone type = 'avatar'
            label = {
                gettextSub('Profile Picture')
            }
            backgroundIcon = 'user-circle'
            disabled = {
                this.state.submitted
            }
            trackFieldChange = {
                this.trackFieldChange
            }
            setDialogState = {
                this.setState.bind(this)
            }
            />

            {
                this.isPartner &&
                    <
                    ImageInputDropZone
                type = 'banner'
                label = {
                    gettextSub('Banner')
                }
                backgroundIcon = 'picture'
                disabled = {
                    this.state.submitted
                }
                trackFieldChange = {
                    this.trackFieldChange
                }
                setDialogState = {
                    this.setState.bind(this)
                }
                />
            }

            {
                this.isPartner && this.renderSocialSelector()
            }

            <
            button type = 'submit'
            disabled = {
                this.state.submitted
            }
            onClick = {
                this.save
            } >
            {
                this.state.submitted && < Icon name = "spinner"
                spin = {
                    true
                }
                />} {
                    this.state.submitted && gettextSub('Saving Updates')
                } {
                    !this.state.submitted && gettextSub('Save Updates')
                } <
                /button> <
                /Form> <
                /div>
            );
        }
    }

    class ImageInputDropZone extends CustomComponent {
        @autobind
        fileChange(e) {
            let files;
            if (e.dataTransfer && e.dataTransfer.files.length) {
                files = e.dataTransfer.files;
            } else {
                files = e.target.files;
            }
            if (files.length) {
                const reader = new FileReader();
                reader.addEventListener('load', () => {
                    const newState = {};
                    const {
                        type
                    } = this.props;
                    newState[type] = reader.result;
                    newState[`${type}File`] = files[0];
                    this.setState(newState);
                    this.props.setDialogState(newState);
                    this.props.trackFieldChange(type);
                });
                reader.readAsDataURL(files[0]);
            }
        }
        @autobind
        ondrop(e) {
            e.preventDefault();
            e.stopPropagation();

            if (!this.props.disabled && e.dataTransfer) {
                this.fileChange(e);
            }
            this.state.draghover = false;
            this.triggerUpdate();
        }
        @autobind
        ondragover(e) {
            e.preventDefault();
            e.stopPropagation();
            if (this.props.disabled) {
                this.state.draghover = false;
            } else {
                this.state.draghover = this.props.type;
                e.dataTransfer.dropEffect = 'copy';
            }
            this.triggerUpdate();
        }
        @autobind
        ondragleave(e) {
            e.preventDefault();
            e.stopPropagation();
            this.state.draghover = false;
            this.triggerUpdate();
        }
        @autobind
        ondragend(e) {
            e.preventDefault();
            e.stopPropagation();
            this.state.draghover = false;
            this.triggerUpdate();
        }

        render() {
            const gettextSub = this.context.gtService.gettextSub;
            const {
                type,
                label,
                backgroundIcon,
                disabled
            } = this.props;

            return ( <
                div className = "ImageInputDropZone" >
                <
                label
                for = {
                    `${type}-pic`
                } > {
                    label
                } {
                    !this.state[type] && < span
                    className = {
                        `dropzone ${this.state.draghover === type ? ' draghover' : ''}`
                    }
                    onDrop = {
                        this.ondrop
                    }
                    onDragOver = {
                        this.ondragover
                    }
                    onDragLeave = {
                        this.ondragleave
                    }
                    onDragEnd = {
                            this.ondragend
                        } >
                        {
                            gettextSub('Drag jpg or png here or click to upload')
                        }

                        <
                        Icon name = {
                            backgroundIcon
                        }
                    />

                    <
                    input
                    id = {
                        `${type}-pic`
                    }
                    type = "file"
                    disabled = {
                        disabled
                    }
                    onChange = {
                        this.fileChange
                    }
                    name = {
                        type
                    }
                    accept = '.jpg, image/jpeg, .png, image/png' >
                        <
                        /input> <
                        /span>} <
                        /label>

                    {
                        this.state[type] &&
                            <
                            img className = {
                                `img-upload ${type}`
                            }
                        src = {
                            this.state[type]
                        }
                        />
                    } <
                    /div>
                );
            }
        }