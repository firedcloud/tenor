import {
    DataSource
} from '../../replete';
import {
    isMobile
} from './util';

export class ProfilePageDataSource extends DataSource {
    key([username]) {
        return username;
    }
    getInitial([username]) {
        const val = {
            section: 'profile'
        };
        this.set([username], val);
        return val;
    }
}

export class GifMakerPageDataSource extends DataSource {
    constructor(store, path) {
        super(store, path);
        this.set(this.defaultSettings());
    }

    defaultSettings() {
        return {
            makerPage: null,
            imagePanelBoundingRect: null,
            view: 'upload',
            itemPageCaptioning: {
                status: false,
                gif: null,
                url: '',
            },
            queueIdx: 0,
        };
    }

    reset() {
        this.set(this.defaultSettings());
    }

    getInitial([arg]) {
        return [];
    }
}
export class GifEditorDataSource extends DataSource {
    constructor(store, path) {
        super(store, path);
        this.set(this.defaultSettings());
    }

    defaultSettings() {
        return {
            editor: null,
            editorBoundingRect: null,
            editorProgress: {},
            encodingStatus: false,
            allowCaptionAutoRepositioning: false, // TODO rename
            tool: null,

            editorToolsUsageTracking: {}, // 'tr' -> trim, 'cr' -> crop, 'ca' -> caption
            trimToolUsageTracking: {
                actions: {}, // ('ui'\'num')
            },
            cropToolUsageTracking: {
                actions: {}, // ('ui'\'num')
                info: null, // eg. '16_9' aspect ratio
            },
            captionToolUsageTracking: {
                actions: {}, // ('ui'\'num')
            },

            captionLayers: [],

            captionData: {
                captionText: '',
                captionFontSize: 32,
                captionColor: '#FFFFFF', // white
                captionCoords: null, // [[x0, y0], [x1, y1]]
                captionCanvasWidth: null,
                captionCanvasHeight: null,
                captionCanvasCroppedWidth: null,
                captionCanvasCroppedHeight: null,
            },

            cropData: {
                cropCoords: null, // [[x0, y0], [x1, y1]]
                cropRatio: false,
                isCropped: false,
            },

            trimData: {
                paused: false,
                startFrameIdx: 0,
                currentFrameIdx: 0,
                endFrameIdx: 0,
                frameRange: [0, 0],
            },
        };
    }

    reset() {
        this.set(this.defaultSettings());
    }

    getInitial([arg]) {
        return [];
    }
}

export class IsMobileDataSource extends DataSource {
    // a bug in replete requires everything to have a DataSource
    constructor(store, path) {
        super(store, path);
        this.set(isMobile());
        window && window.addEventListener('resize', this.update.bind(this));
    }

    getInitial() {
        return isMobile();
    }

    update() {
        const next = isMobile();
        const prev = this.get();
        if (next !== prev) {
            this.set(next);
            return next;
        }
        return prev;
    }
}