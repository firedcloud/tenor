import { getFileExtension } from "../../../common/util/files";

export const createMediaFormatsList = ({ queue, type }) => {
  const list = {};
  queue
    .map((queueItem) => {
      if (type === "file") {
        return getFileExtension({
          file: queueItem,
        });
      } else if (type === "uploadObject") {
        return queueItem.getOriginalMediaType();
      }
    })
    .forEach((mediaType) => {
      if (mediaType) {
        list[mediaType] = true;
      } else {
        list["na"] = true;
      }
    });
  return list;
};
