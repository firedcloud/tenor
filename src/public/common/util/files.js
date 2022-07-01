import mime from 'mime-types';
import LiteURL from 'lite-url';

export const getFileExtension = ({
    url,
    file,
    mimetype
}) => {
    let mediaType = null;
    if (url) {
        const path = new LiteURL(url).pathname;
        mimetype = mime.lookup(path);
    } else if (file) {
        if (file.type) {
            mimetype = file.type;
        } else {
            mimetype = mime.lookup(file.name);
        }
    }

    if (mimetype) {
        mediaType = mime.extension(mimetype);
    }
    return mediaType;
};

export const getFilename = ({
    url,
    file
}) => {
    let filename;
    if (url) {
        const path = new LiteURL(url).pathname;
        filename = path.split('/').slice(-1)[0];
    } else if (file) {
        filename = file.name.toLowerCase(); // NOTE Backend expects lowercase file extension.
    }
    return filename;
};

export const isValidFileType = (dataObject, allowedFileTypes) => {
    const mediaType = getFileExtension(dataObject);
    return allowedFileTypes.includes(mediaType);
};

export const getMimeType = (fileType) => {
    return mime.lookup(fileType);
};