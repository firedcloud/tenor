import { ts } from "../../common/util";

const $rootScope = {};

$rootScope.location = null;
$rootScope.currentPath = "/";
$rootScope.previousPath = "/";
$rootScope.setLocation = function (newLoc) {
  const oldLoc = $rootScope.location;
  $rootScope.location = newLoc;
  console.log(ts(), "locationSet", newLoc, oldLoc);
  $rootScope.currentPath = newLoc.pathname;
  if (oldLoc) {
    $rootScope.previousPath = oldLoc.pathname;
  }
};

$rootScope.searchURLSep = "-";
$rootScope.searchInputSepRegEx = /[\s,]+/g;
$rootScope.searchEndGifs = `${$rootScope.searchURLSep}gifs`;
$rootScope.searchEndStickers = `${$rootScope.searchURLSep}stickers`;
$rootScope.searchEndRegEx = new RegExp(
  `(${$rootScope.searchEndGifs}|${$rootScope.searchEndStickers})$`
);

// Prevent accidentally dropping files onto body, which would unload the
// page and load the dragged file.
function cancelEvent(e) {
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }
}

function onbodydragover(e) {
  cancelEvent(e);
  if (e) {
    e.dataTransfer.dropEffect = "none";
  }
}
if (process.env.BROWSER) {
  document.body.ondrop = cancelEvent;
  document.body.ondragover = onbodydragover;
  document.body.ondragleave = cancelEvent;
  document.body.ondragend = cancelEvent;
}

$rootScope.tzOffset = new Date().getTimezoneOffset() * 60;
$rootScope.humanize = function (ts) {
  const seconds = Date.now() / 1000 - ts;
  const minutes = seconds / 60;
  const hours = minutes / 60;
  const days = hours / 24;
  if (days > 1) {
    return `${Math.ceil(days)} d`;
  }
  if (hours > 1) {
    return `${Math.ceil(hours)} h`;
  }
  if (minutes > 1) {
    return `${Math.ceil(minutes)} m`;
  }
  return `${Math.ceil(seconds)} s`;
};

export default $rootScope;
