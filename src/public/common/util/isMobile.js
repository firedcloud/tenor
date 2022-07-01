let _isMobile = false;
let _iOS = false;
let _chrome = false;

function setIsMobile() {
    if (process.env.BROWSER) {
        _isMobile = window.innerWidth <= 840;
        _iOS = (/iphone|ipod|ipad/i).test(window.navigator.userAgent) && !window.MSStream;
        _chrome = (/Chrome/).test(window.navigator.userAgent);
    }
}
if (process.env.BROWSER) {
    window.addEventListener('resize', function() {
        setIsMobile();
    });
    setIsMobile();
}
export function isMobile() {
    return _isMobile;
}
export function iOS() {
    return _iOS;
}
export function isChrome() {
    // NOTE Chrome on iOS is just a skin of Safari
    return _chrome;
}