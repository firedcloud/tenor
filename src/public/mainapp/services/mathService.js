import { isMobile } from "../../common/util/isMobile";
import { isSticker } from "../../common/util/isSticker";
import { MEDIA_TYPE } from "../components/GifConstants";

export default function mathService({ element, staticColumns }) {
  let y;
  let width;
  let height;
  let containerWidth;
  let numColumns;
  let i;
  let item;
  let colNum;
  let currentColumn;
  let minBottomY;
  let maxBottomY;
  let columnTailItems;
  let spacing;
  const DEFAULT_WIDTH = staticColumns == 1 ? 200 : 400;
  let style;
  let borderLeft;
  let borderRight;
  let paddingLeft;
  let paddingRight;
  let paddingTop;
  let paddingBottom;
  let imgWidth;
  let imgHeight;
  let gif;
  let mediaType;

  function resetVars() {
    y = 0;
    (spacing = isMobile() ? 10 : 20),
      (style = element ? window.getComputedStyle(element) : {});
    paddingLeft = parseInt(style["padding-left"] || "0");
    paddingRight = parseInt(style["padding-right"] || "0");
    paddingTop = parseInt(style["padding-top"] || "0");
    paddingBottom = parseInt(style["padding-bottom"] || "0");
    borderLeft = parseInt(style["border-left-width"] || "0");
    borderRight = parseInt(style["border-right-width"] || "0");
    containerWidth =
      element && element.offsetWidth
        ? element.offsetWidth -
          paddingLeft -
          paddingRight -
          borderLeft -
          borderRight
        : DEFAULT_WIDTH;

    if (staticColumns) {
      numColumns = parseInt(staticColumns);
    } else if (containerWidth > 1100) {
      numColumns = 4;
    } else if (containerWidth > 576) {
      numColumns = 3;
    } else {
      numColumns = 2;
    }
    width = (containerWidth - numColumns * spacing) / numColumns;
    height = 100;
    i = 0;
    maxBottomY = 0;
    columnTailItems = {};
    for (colNum = 0; colNum < numColumns; colNum++) {
      columnTailItems[colNum] = {
        bottomY: 0,
      };
    }
  }

  resetVars();

  return {
    compute: function (data, reset) {
      if (reset) {
        resetVars();
      }

      if (!data || data.length === 0) {
        console.info("mathService: no data");
        return {
          loaderHeight: 0,
          numColumns: 0,
        };
      }

      // go forwards through array and add missing data
      for (; i < data.length; i++) {
        item = data[i];

        // items without .media are DOM elements, not API results.
        if (item.media && item.media[0]) {
          mediaType = isSticker(item) ? MEDIA_TYPE.STICKER : MEDIA_TYPE.GIF;
          imgWidth = item.media[0].tinygif.dims[0];
          imgHeight = item.media[0].tinygif.dims[1];
        } else {
          imgWidth = item.dataset.width;
          imgHeight = item.dataset.height;
        }
        if (mediaType === MEDIA_TYPE.STICKER) {
          height = width;
        } else {
          height = (width / imgWidth) * imgHeight;
        }

        currentColumn = 0;
        minBottomY = columnTailItems[currentColumn].bottomY;
        for (colNum = 1; colNum < numColumns; colNum++) {
          if (columnTailItems[colNum].bottomY < minBottomY) {
            currentColumn = colNum;
            minBottomY = columnTailItems[currentColumn].bottomY;
          }
        }

        y = minBottomY;

        columnTailItems[currentColumn] = {
          width: width,
          height: height,
          y: y,
          bottomY: height + y + spacing,
          column: currentColumn,
          index: i,
        };

        if (item.media) {
          item.details = columnTailItems[currentColumn];
        } else {
          item.dataset.colIndex = currentColumn;
          gif = item.getElementsByTagName("img")[0];
          // Setting the nodeValue helps prevent rounding of floats,
          // which allows us to duplicate Inferno's behavior.
          gif.attributes.width.nodeValue = width.toString();
          gif.attributes.height.nodeValue = height.toString();
        }
      }
      for (colNum = 0; colNum < numColumns; colNum++) {
        if (columnTailItems[colNum].bottomY > maxBottomY) {
          maxBottomY = columnTailItems[colNum].bottomY;
        }
      }
      return {
        loaderHeight: maxBottomY + paddingTop + paddingBottom,
        numColumns: numColumns,
      };
    },
  };
}
