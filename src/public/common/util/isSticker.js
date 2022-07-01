// NB isSticker is imported by inlineMathService. We want to keep that file as
// small as possible, so we are defining it here instead of within the Gif
// component (which would require importing everything in Gif.js).
export function isSticker(gif) {
    return gif.flags && gif.flags.includes('sticker');
}