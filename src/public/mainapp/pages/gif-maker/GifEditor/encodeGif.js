import {
    window
} from '../../../../common/util';
import {
    GifBaseLayer
} from './layers';
import EncodeGifWorker from './EncodeGif.worker.js'; // eslint-disable-line import/default


function getFrameIndexingWorker() {
    const worker = new EncodeGifWorker();
    worker.onerror = function(...args) {
        console.error('worker onerror', worker, ...args);
    };
    worker.onmessageerror = function(...args) {
        console.error('worker onmessageerror', worker, ...args);
    };
    return worker;
}


export default function encodeGif(frames, startFrameIdx, endFrameIdx, editor, progressCB) {
    return new Promise((resolve, reject) => {
        startFrameIdx = startFrameIdx || 0;
        endFrameIdx = endFrameIdx || frames.length - 1;
        const NUM_INDEXING_WORKERS = 2;
        const numFrames = endFrameIdx - startFrameIdx;
        const MAX_NUM_SAMPLE_FRAMES = 4;
        // If we have fewer than MAX_NUM_SAMPLE_FRAMES, just use all frames.
        const NUM_SAMPLE_FRAMES = Math.min(numFrames, MAX_NUM_SAMPLE_FRAMES);

        // (frames added to palette) + (1 for drawing frames) + (each frame encoded).
        const PROGRESS_TOTAL = NUM_SAMPLE_FRAMES + 1 + numFrames;
        let cumProgress = 0;

        function progressStep() {
            cumProgress++;
            progressCB(cumProgress / PROGRESS_TOTAL);
        }

        function progressComplete() {
            progressCB(1);
        }

        // TODO FIXME we need to create GIFs with original dimensions
        const width = editor ? editor.renderCtx.canvas.width : frames[0].dims.width;
        const height = editor ? editor.renderCtx.canvas.height : frames[0].dims.height;

        const indexedPixelsAry = [];
        let lastIndexedFrameIdx = startFrameIdx - 1;
        let lastWrittenFrameIdx = startFrameIdx - 1;
        let palette;

        const frameIndexingWorkers = [];
        for (let i = 0; i < NUM_INDEXING_WORKERS; i++) {
            frameIndexingWorkers.push(getFrameIndexingWorker());
        }

        function indexAvailableFrames() {
            // queue all frames to frameIndexingWorkers
            if (!palette) {
                return;
            }
            for (let frameIdx = lastIndexedFrameIdx + 1; frameIdx <= endFrameIdx; frameIdx++) {
                if (frames[frameIdx].composedPixels) {
                    lastIndexedFrameIdx = frameIdx;
                    frameIndexingWorkers[frameIdx % frameIndexingWorkers.length].postMessage({
                        task: 'indexFrame',
                        composedPixels: frames[frameIdx].composedPixels,
                        frameIdx,
                        width,
                        height,
                    });
                } else {
                    break;
                }
            }
        }

        const mainWorker = new EncodeGifWorker();
        mainWorker.onerror = function(errorEvent) {
            console.error('worker onerror', mainWorker, errorEvent);
            reject(errorEvent);
        };
        mainWorker.onmessageerror = function(errorEvent) {
            console.error('worker onmessageerror', mainWorker, errorEvent);
            reject(errorEvent);
        };
        mainWorker.onmessage = function(e) {
            const task = e.data.task;

            switch (task) {
                case 'addPalettePixels':
                    if (e.data.palette) {
                        console.timeEnd('palette');
                        palette = e.data.palette;
                        mainWorker.postMessage({
                            task: 'startGif',
                            width,
                            height,
                        });
                        frameIndexingWorkers.forEach((frameIndexingWorker) => {
                            const composedPixels = frames[startFrameIdx].composedPixels;
                            frameIndexingWorker.postMessage({
                                task: 'prepFrameIndexing',
                                palette,
                                width,
                                height,
                                framePtrLen: composedPixels.length * composedPixels.BYTES_PER_ELEMENT,
                            });
                        });
                    }
                    progressStep();
                    break;
                case 'startGif':
                    indexAvailableFrames();
                    break;
                case 'writeFrame':
                    progressStep();
                    if (e.data.frameIdx === endFrameIdx) {
                        mainWorker.postMessage({
                            task: 'endGif',
                        });
                    }
                    break;
                case 'endGif':
                    progressComplete();
                    console.timeEnd('render');
                    mainWorker.postMessage({
                        task: 'cleanup',
                    });
                    frameIndexingWorkers.forEach(function(worker) {
                        worker.postMessage({
                            task: 'cleanup',
                        });
                    });

                    resolve(e.data.gifData);
                    break;
                case 'cleanup':
                    mainWorker.terminate();
                    break;
            }
        };

        frameIndexingWorkers.forEach(function(worker) {
            worker.addEventListener('message', function(e) {
                const task = e.data.task;
                switch (task) {
                    case 'indexFrame':
                        indexedPixelsAry[e.data.frameIdx] = e.data.indexedPixels;

                        // We can start writing frames in the main worker. We need to
                        // take into account that frames might finish indexing out
                        // of order.
                        for (let frameIdx = lastWrittenFrameIdx + 1; frameIdx <= endFrameIdx; frameIdx++) {
                            // Skip past frames that were already written.
                            if (frameIdx > lastWrittenFrameIdx) {
                                // If it has indexedPixels, it can be written.
                                if (indexedPixelsAry[frameIdx]) {
                                    lastWrittenFrameIdx = frameIdx;
                                    mainWorker.postMessage({
                                        task: 'writeFrame',
                                        frameIdx,
                                        indexedPixels: indexedPixelsAry[frameIdx],
                                        delay: frames[frameIdx].delay,
                                    });
                                } else {
                                    // We've gone too far, the next frame that needs
                                    // writing doesn't have indexedPixels yet.
                                    break;
                                }
                            }
                        }
                        break;
                    case 'cleanup':
                        worker.terminate();
                        break;
                }
            });
        });

        const paletteSampleIdxs = [];
        const paletteSampleIdxStep = Math.floor(numFrames / NUM_SAMPLE_FRAMES);
        for (let i = 0; i < NUM_SAMPLE_FRAMES; i++) {
            paletteSampleIdxs.push(startFrameIdx + (i * paletteSampleIdxStep));
        }
        let paletteSampleIdx = 0;

        let baseLayer;
        let renderCtx;
        if (editor) {
            renderCtx = editor.renderCtx;
        } else {
            baseLayer = new GifBaseLayer({
                frames
            });
            const renderCanvas = document.createElement('canvas');
            renderCanvas.width = width;
            renderCanvas.height = height;
            renderCtx = renderCanvas.getContext('2d');
            baseLayer.update({
                renderCanvas: renderCanvas,
                renderCtx: renderCtx,
            });
        }

        new Promise((framesComposed) => {
            let frameIdx = startFrameIdx;
            console.time('drawFrames');
            const step = () => {
                if (editor) {
                    editor.drawFrame(frameIdx, false);
                } else {
                    baseLayer.draw(frameIdx, false);
                }

                frames[frameIdx].composedPixels = renderCtx.getImageData(
                    0,
                    0,
                    width,
                    height,
                ).data;

                if (paletteSampleIdxs.includes(frameIdx)) {
                    if (paletteSampleIdx === 0) {
                        console.time('palette');
                    }
                    mainWorker.postMessage({
                        task: 'addPalettePixels',
                        numSampleFrames: NUM_SAMPLE_FRAMES,
                        idx: paletteSampleIdx,
                        composedPixels: frames[frameIdx].composedPixels,
                    });
                    paletteSampleIdx++;
                }

                indexAvailableFrames();

                frameIdx++;
                if (frameIdx > endFrameIdx) {
                    framesComposed();
                } else {
                    window.requestAnimationFrame(step);
                }
            };
            window.requestAnimationFrame(step);
        }).then(() => {
            console.timeEnd('drawFrames');
            progressStep();
            console.time('render');
        });
    });
}