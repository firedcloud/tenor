import ParseGifWorker from './ParseGif.worker.js'; // eslint-disable-line import/default


export default function parseGif(arrayBuffer) {
    return new Promise((resolve, reject) => {
        const worker = new ParseGifWorker();
        worker.onerror = function(errorEvent) {
            console.error('worker onerror', worker, errorEvent);
            reject(errorEvent);
        };
        worker.onmessageerror = function(errorEvent) {
            console.error('worker onmessageerror', worker, errorEvent);
            reject(errorEvent);
        };
        worker.onmessage = function(e) {
            console.log('e', e);
            resolve(e.data);
        };
        worker.postMessage(arrayBuffer);
    });
}