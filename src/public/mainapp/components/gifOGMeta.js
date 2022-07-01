import {
    Component
} from 'inferno'; // eslint-disable-line no-unused-vars


const MAX_FB_IMG_SIZE = 5 * Math.pow(1024, 2);


export function gifOGMeta(gif) {
    // Not a proper component, since JSX doens't have good support for adjacent elements.
    let collection = false;
    if (gif && gif.length) {
        gif = gif[0];
        collection = true;
    }
    if (!gif || !gif.media || !gif.media.length) {
        return;
    }

    let fbImage;
    let media;
    for (const format of ['gif', 'mediumgif', 'tinygif', 'nanogif']) {
        media = gif.media[0][format];
        // If we already have an image and this one is too small, keep selected format.
        if (fbImage && media.dims[0] < 200 && media.dims[1] < 200) {
            break;
        }
        fbImage = media;
        // If we don't know the size, or if we know the size is OK, keep this format.
        if (!fbImage.size || fbImage.size <= MAX_FB_IMG_SIZE) {
            break;
        }
    }
    const mp4 = gif.media[0].mp4;

    const ary = [
        collection && < meta name = "twitter:image"
        content = {
            gif.media[0].gif.url
        }
        />,

        <
        link rel = "image_src"
        href = {
            gif.media[0].gif.url
        }
        />,

        <
        meta property = "og:url"
        content = {
            fbImage.url
        }
        />, <
        meta property = "og:description"
        content = "Click to view the GIF" / > ,

        <
        meta property = "og:type"
        content = {
            collection ? 'website' : 'video.other'
        }
        />,

        <
        meta property = "og:image"
        content = {
            fbImage.url
        }
        />, <
        meta property = "og:image:type"
        content = "image/gif" / > , <
        meta property = "og:image:width"
        content = {
            fbImage.dims[0]
        }
        />, <
        meta property = "og:image:height"
        content = {
            fbImage.dims[1]
        }
        />,

        <
        meta property = "og:video"
        content = {
            mp4.url
        }
        />, <
        meta property = "og:video:secure_url"
        content = {
            mp4.url
        }
        />, <
        meta property = "og:video:type"
        content = "video/mp4" / > , <
        meta property = "og:video:width"
        content = {
            mp4.dims[0]
        }
        />, <
        meta property = "og:video:height"
        content = {
            mp4.dims[1]
        }
        />,
    ];

    const webm = gif.media[0].webm;

    if (webm && webm.url) {
        ary.push.apply(ary, [ <
            meta property = "og:video"
            content = {
                webm.url
            }
            />, <
            meta property = "og:video:secure_url"
            content = {
                webm.url
            }
            />, <
            meta property = "og:video:type"
            content = "video/webm" / > ,
        ]);
        if (webm.dims) {
            ary.push.apply(ary, [ <
                meta property = "og:video:width"
                content = {
                    webm.dims[0]
                }
                />, <
                meta property = "og:video:height"
                content = {
                    webm.dims[1]
                }
                />,
            ]);
        }
    }

    return ary;
}