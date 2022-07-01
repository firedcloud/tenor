export default function parseVideo(file, settings) {
    return new Promise((resolve, reject) => {
        console.time('video parse time');
        const objectUrl = window.URL.createObjectURL(file);
        const frames = [];
        let {
            videoSampleRate,
            numVideoElements,
            videoMaxWidth
        } = settings;

        const videoTest = document.createElement('video');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', {
            alpha: false
        });
        const timeStamps = [];

        videoTest.onloadedmetadata = () => {
            if (videoMaxWidth) {
                // NOTE Enforcing a max width for videos has a minimal effect on
                // parsing time but signicant effect on file size & playback.
                if (videoTest.videoWidth > videoMaxWidth) {
                    canvas.width = videoMaxWidth;
                    canvas.height = Math.floor(videoTest.videoHeight * videoMaxWidth / videoTest.videoWidth);
                } else {
                    canvas.width = videoTest.videoWidth;
                    canvas.height = videoTest.videoHeight;
                }
            } else {
                canvas.width = videoTest.videoWidth;
                canvas.height = videoTest.videoHeight;
            }

            for (let time = 10; time <= videoTest.duration * 1000; time += videoSampleRate) {
                timeStamps.push(time / 1000);
            }
            if (timeStamps.length < numVideoElements) {
                numVideoElements = timeStamps.length;
            }
            startParse();
        };
        videoTest.src = objectUrl;

        const startParse = () => {
            console.log('Number of video elements: ', numVideoElements);
            const parsingQueue = [];
            const indexCaptured = {};

            for (let vidEl = 0; vidEl < numVideoElements; vidEl++) {
                parsingQueue.push(new Promise((resolve) => {
                    const video = document.createElement('video');
                    let finishedParsing = false;
                    let index = vidEl;

                    const asyncVideoReadyCheck = (idx) => {
                        window.requestAnimationFrame(() => {
                            if (video.readyState >= 2) {
                                // NOTE Data is available for the current playback position
                                captureFrame();
                            } else {
                                asyncVideoReadyCheck();
                            }
                        });
                    };

                    const captureFrame = () => {
                        if (indexCaptured[index] || finishedParsing) {
                            return;
                        }
                        console.log(`${vidEl} - capturing frame, TS: ${video.currentTime}`);
                        indexCaptured[index] = true;
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        frames[index] = {
                            imageData,
                            dims: {
                                width: canvas.width,
                                height: canvas.height,
                            },
                            start: video.currentTime * 1000,
                            end: video.currentTime * 1000 + videoSampleRate,
                            delay: videoSampleRate,
                        };
                        index += numVideoElements;
                        const nextTimeStamp = timeStamps[index];
                        if (nextTimeStamp) {
                            video.currentTime = nextTimeStamp;
                            asyncVideoReadyCheck(index);
                        } else {
                            finishedParsing = true;
                            video.currentTime = null;
                            resolve();
                        }
                    };

                    video.muted = true;
                    video.onloadeddata = () => {
                        const timeStamp = timeStamps[index];
                        if (timeStamp) {
                            video.currentTime = timeStamp;
                            asyncVideoReadyCheck(index);
                        } else {
                            resolve();
                        }
                    };
                    video.autoplay = true;
                    video.src = objectUrl;
                }));
            }

            Promise.all(parsingQueue).then(() => {
                window.URL.revokeObjectURL(objectUrl);
                console.timeEnd('video parse time');
                console.log('Number of frames: ', frames.length);
                resolve(frames);
            });
        };
    });
}