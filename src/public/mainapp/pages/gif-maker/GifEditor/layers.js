import {
    CAPTION_COLORS
} from '../constants';

export class AbstractLayer {
    constructor(options) {
        this.update(options);
    }
    update(options, defaults) {
        options = options || {};
        options = Object.assign(defaults, this, options);
        Object.assign(this, options);
    }
    drawImage(ctx, drawable) {
        const canvas = ctx.canvas;
        if (this.cropCoords) {
            ctx.drawImage(
                drawable,
                this.cropCoords[0][0],
                this.cropCoords[0][1],
                this.cropCoords[1][0] - this.cropCoords[0][0],
                this.cropCoords[1][1] - this.cropCoords[0][1],
                0,
                0,
                canvas.width,
                canvas.height
            );
        } else {
            ctx.drawImage(
                drawable,
                0,
                0,
                canvas.width,
                canvas.height
            );
        }
    }
}

export class GifBaseLayer extends AbstractLayer {
    constructor(options) {
        super(options);

        this.tempPreviewCtx = document.createElement('canvas').getContext('2d');
        this.tempRenderCtx = document.createElement('canvas').getContext('2d');
        this.previewFrameImageData;
        this.renderFrameImageData;
    }
    update(options) {
        super.update(options, {
            frames: [],
        });
    }
    draw(frameIdx, preview) {
        const ctx = preview ? this.previewCtx : this.renderCtx;
        if (!ctx) {
            return;
        }

        // FIXME: is tempCtx still needed? We could pre-generate bitmaps.
        const tempCtx = preview ? this.tempPreviewCtx : this.tempRenderCtx;
        const tempCanvas = tempCtx.canvas;

        const frame = this.frames[frameIdx];

        const imageData = frame.imageData;

        if (imageData.width !== tempCanvas.width || imageData.height !== tempCanvas.height) {
            tempCanvas.width = imageData.width;
            tempCanvas.height = imageData.height;
        }

        // draw the patch back over the canvas
        tempCtx.putImageData(frame.imageData, 0, 0);
        this.drawImage(ctx, tempCanvas);
    }
}

export class CaptionLayer extends AbstractLayer {
    constructor(options) {
        super(options);
        this.minWidth = 100;
    }

    update(options) {
        super.update(options, {
            text: '',
            fontSize: 32,
            textAlign: 'center',
            fillStyle: CAPTION_COLORS.white,
            lineWidth: options.captionCtx ? options.captionCtx.canvas.height / 1000 : '0.5',
            x: 0,
            y: 0,
            width: 0,
            height: 0,
        });

        if (this.text && this.captionCtx) {
            this.setPrefsOnCanvas(this.captionCtx);
        }
    }

    setPrefsOnCanvas(ctx) {
        ctx.font = `500 ${this.fontSize}px Ubuntu`;
        ctx.textAlign = this.textAlign;
        ctx.fillStyle = this.fillStyle;
        ctx.strokeStyle = this.fillStyle === CAPTION_COLORS.black ? CAPTION_COLORS.white : CAPTION_COLORS.black;
        ctx.lineWidth = this.lineWidth;
    }
    draw(frameIdx, preview) {
        const ctx = preview ? this.captionCtx : this.renderCtx;
        if (!ctx) {
            return;
        }
        if (preview) {
            ctx.clearRect(0, 0, this.captionCanvas.width, this.captionCanvas.height);
        }
        this.setPrefsOnCanvas(ctx);

        for (const [i, line] of this.text.split(/[\n\r]/g).entries()) {
            const yOffset = this.fontSize * (1 + i);
            ctx.fillText(line, this.x, this.y + yOffset);
            ctx.strokeText(line, this.x, this.y + yOffset);
        }
    }
}


export class CropLayer extends AbstractLayer {
    update(options) {
        super.update(options, {
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            enabled: false,
        });
    }
    draw(frameIdx, preview) {
        if (!preview || !this.enabled || !this.width || !this.height) {
            return;
        }
        const ctx = preview ? this.previewCtx : this.renderCtx;
        if (!ctx) {
            return;
        }
    }
}