export const ITEM_STATES = {
    PENDING: 'pending',
    INPROGRESS: 'inprogress',
    DONE: 'done',
    FAILURE: 'failure',
};

export const SETTINGS = {
    MIN_TIME: 400, // FIXME need better handling of staged gifs that are already shorter than MIN_TIME
    MAX_TIME: null, // TODO set max length for an edited gif?
    MIN_FONTSIZE: 12,
    ALLOWED: ['gif', 'mp4'],
    ALLOWED_STATIC_BETA: ['gif', 'mp4', 'png', 'jpg', 'jpeg'],
    ALLOWED_URLS: ['gif'], // TODO add support for mp4 urls
    ALLOWED_URLS_STATIC_BETA: ['gif', 'png', 'jpg', 'jpeg'], // TODO add support for mp4 urls
    FILE_PICKER_ACCEPT: '.gif, image/gif, .mp4, video/mp4',
    FILE_PICKER_STATIC_ACCEPT: '.jpg, image/jpeg, .png',
};

export const FILE_TYPES = {
    STATIC_IMAGES: ['jpg', 'jpeg', 'png'],
    FILES: ['gif', 'mp4', 'png', 'jpg', 'jpeg'],
    GIF: 'gif',
    MP4: 'mp4',
    URL: 'url',
};

export const CAPTION_COLORS = {
    white: '#FFFFFF',
    black: '#000000',
    blue: '#4285F4',
    green: '#0F9D58',
    yellow: '#F4B400',
    red: '#DB4437',
    pink: '#ff69b4',
};

export const EDITOR_TOOL_TRACKING_ID = {
    CAPTION: 'ca',
    TRIM: 'tr',
    CROP: 'cr',
};

export const CROP_RATIOS = {
    '1_1': 1,
    '4_3': 1.333,
    '16_9': 1.777,
    '2_1': 2,
};