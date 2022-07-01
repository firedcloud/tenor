import "../common/polyfill";
import { Route, Switch } from "inferno-router";

import { AuthDialog } from "../common/dialogs/AuthDialog";
import { BaseApp } from "../common/components/BaseApp";
import { HTTP404Page } from "../common/components/http404";
import { CONSTANTS, initConfig } from "../common/config";
import { DialogContainer } from "../common/dialog";
import authService from "../common/services/authService";
import {
  getRouter,
  runIfInBrowser,
  setupAmplio,
  setupAnalytics,
} from "../common/util";

import { GifPage } from "./pages/gif";
import { FeaturedPage } from "./pages/featured";
import { ReactionsPage } from "./pages/reactions";
import { SearchPage } from "./pages/search";
import { ExplorePage, ExploreHomePage } from "./pages/explore";
import { PackPage } from "./pages/packs";
import { CollectionPage } from "./pages/collections";
import { UserProfilePage } from "./pages/profileUser";
import { BrandedPartnerPage } from "./pages/profilePartner";
import { GifMakerPage } from "./pages/gif-maker";
import { EmotionalGraphPage } from "./pages/about/emotional-graph";
import { PartnerSpotlightPage } from "./pages/about/partner-spotlight";
import { PressPage } from "./pages/about/press";
import { AboutFAQPageRedirect } from "./pages/about/about-faq";
import { AboutUsPage } from "./pages/about/about-us";
import { ContactPage } from "./pages/about/contact";
import { LegalTermsPage } from "./pages/about/legal-terms";
import { LegalTermsUpdateRedirect } from "./pages/about/legal-terms-update";
import { LegalTermsDeveloperUpdateRedirect } from "./pages/about/legal-terms-developer-update";
import { LegalPrivacyPage } from "./pages/about/legal-privacy";
import { LegalPrivacyUpdateRedirect } from "./pages/about/legal-privacy-update";
import { LGLegalDataUsagePage, LGLegalPrivacyRedirect } from "./pages/about/lg";
import { ForgotPasswordPage } from "./pages/about/forgot-password";
import { IMessagePage } from "./pages/about/imessage";
import { MacPage } from "./pages/about/mac";

import { NavBar } from "./components/NavBar";
import {
  DataSaverModeDataSource,
  GifImgSizesDataSource,
} from "./components/Gif";
import { IsMobileDataSource } from "../common/ui-datasources";
import { TopSearchBar } from "./components/TopSearchBar";

import { OptInDialog } from "./components/OptInDialog";
import { FlagDialog } from "./components/FlagDialog";
import { EditProfileDialog } from "./components/EditProfileDialog";
import { ConfirmationDialog } from "../common/dialogs/ConfirmationDialog";
import { CaptionShareDialog } from "./components/CaptionShareDialog";
import { StaticImageDialog } from "./components/dialogs/StaticImageDialog";
import { PopupDialog } from "../common/dialogs/PopupDialog";

import rootScope from "./services/rootScope";

// import animate.css
require("animate.css/source/_base.css");
require("animate.css/source/sliding_entrances/slideInLeft.css");
require("animate.css/source/sliding_entrances/slideInRight.css");
require("animate.css/source/sliding_entrances/slideInUp.css");
require("animate.css/source/sliding_exits/slideOutLeft.css");
require("animate.css/source/sliding_exits/slideOutRight.css");
require("animate.css/source/sliding_exits/slideOutDown.css");
require("animate.css/source/fading_entrances/fadeInDown.css");
require("animate.css/source/fading_exits/fadeOutUp.css");

require("~/assets/scss/bootstrap.min.css");
require("~/assets/scss/ngDialog.min.css");
require("~/assets/scss/ngDialog-theme-default.min.css");
require("~/assets/scss/components/dialog.scss");
require("~/assets/fonts/fonts.css");
require("./app.scss");

export const PATH = "";

class App extends BaseApp {
  beforeChildren() {
    const currentPath = this.context.gtService.delocalizeUrlPath(
      this.context.router.history.location.pathname
    );
    const showNav = ["/mac", "/imessage"].indexOf(currentPath) === -1;
    const showSearch =
      [
        "/mac",
        "/about-us",
        "/partners",
        "/contentpartners",
        "/imessage",
        "/gif-maker",
      ].indexOf(currentPath) === -1 && !currentPath.includes("/developer");

    return [showNav && <NavBar />, showSearch && <TopSearchBar />];
  }
  afterChildren() {
    return (
      <DialogContainer
        dialogMap={{
          "auth-dialog": {
            class: AuthDialog,
            options: {
              authService: authService,
              favoriting: true,
              signupAllowed: true,
              getLoggedInURL: () => {
                return this.linkToProfile();
              },
              expiredSession: false,
              forceLogInToUpload: false,
              loggedinCallback: undefined,
              uploadQueue: undefined,
            },
          },
          "opt-in-dialog": {
            class: OptInDialog,
            options: {
              maxCloseActions: 2,
            },
          },
          "flag-dialog": {
            class: FlagDialog,
          },
          "edit-profile-dialog": {
            class: EditProfileDialog,
          },
          "confirmation-dialog": {
            class: ConfirmationDialog,
            options: {
              isBlockingDialog: true,
            },
            style: {
              width: "440px",
              maxWidth: "100%",
              padding: "24px",
            },
          },
          "caption-share-dialog": {
            class: CaptionShareDialog,
          },
          "static-image-dialog": {
            class: StaticImageDialog,
          },
          "popup-dialog": {
            class: PopupDialog,
          },
        }}
      />
    );
  }
}

function routesForLocale(appGlobals) {
  const gtService = appGlobals.gtService;

  let path = `/${PATH}`;
  const locale = gtService.gt.locale;
  if (locale && locale !== "en") {
    path = `/${locale}${path}`;
  }
  // We need a mapping so we can untranslate paths if needed.
  // This needs to be a function so translating happens on the fly, instead of getting hard coded as one language.
  const pathMap = {
    "gif-maker": gtService.gt.pgettext("url path component", "gif-maker"),
    search: gtService.gt.pgettext("url path component", "search"),
    view: gtService.gt.pgettext("url path component", "view"),
    reactions: gtService.gt.pgettext("url path component", "reactions"),
    explore: gtService.gt.pgettext("url path component", "explore"),
    users: gtService.gt.pgettext("url path component", "users"),
    official: gtService.gt.pgettext("url path component", "official"),
    packs: gtService.gt.pgettext("url path component", "packs"),
    collections: gtService.gt.pgettext("url path component", "collections"),
    "emotional-graph": gtService.gt.pgettext(
      "url path component",
      "emotional-graph"
    ),
    partners: gtService.gt.pgettext("url path component", "partners"),
    contentpartners: gtService.gt.pgettext(
      "url path component",
      "contentpartners"
    ),
    press: gtService.gt.pgettext("url path component", "press"),
    "about-faq": gtService.gt.pgettext("url path component", "about-faq"),
    "about-us": gtService.gt.pgettext("url path component", "about-us"),
    imessage: gtService.gt.pgettext("url path component", "imessage"),
    contact: gtService.gt.pgettext("url path component", "contact"),
    "legal-terms": gtService.gt.pgettext("url path component", "legal-terms"),
    "legal-terms-update": gtService.gt.pgettext(
      "url path component",
      "legal-terms-update"
    ),
    "legal-terms-developer-update": gtService.gt.pgettext(
      "url path component",
      "legal-terms-developer-update"
    ),
    "legal-privacy": gtService.gt.pgettext(
      "url path component",
      "legal-privacy"
    ),
    "legal-privacy-update": gtService.gt.pgettext(
      "url path component",
      "legal-privacy-update"
    ),
    "lg-legal-privacy": gtService.gt.pgettext(
      "url path component",
      "legal/privacy"
    ),
    "lg-legal-data-usage": gtService.gt.pgettext(
      "url path component",
      "legal/data-usage"
    ),
    "forgot-password": gtService.gt.pgettext(
      "url path component",
      "forgot-password"
    ),
    mac: gtService.gt.pgettext("url path component", "mac"),
  };
  for (const key of Object.keys(pathMap)) {
    // Need to make sure paths are url encoded and lowercased.
    pathMap[key] = encodeURI(pathMap[key]).toLowerCase();
  }
  gtService.setLocalizedPaths(pathMap);
  console.log(`${path}${pathMap["lg-legal-privacy"]}`);

  return (
    <App appGlobals={appGlobals}>
      {" "}
      <Switch />
      <Route exact={true} path="/" component={FeaturedPage} />{" "}
      <Route path={`${path}${pathMap["gif-maker"]}`} component={GifMakerPage} />{" "}
      <Route
        path={`${path}${pathMap["search"]}/:searchData`}
        component={SearchPage}
      />{" "}
      <Route path={`${path}${pathMap["search"]}/`} component={SearchPage} />{" "}
      <Route path={`${path}${pathMap["view"]}/:id`} component={GifPage} />{" "}
      <Route
        path={`${path}${pathMap["reactions"]}`}
        component={ReactionsPage}
      />{" "}
      <Route
        path={`${path}${pathMap["explore"]}/:searchData`}
        component={ExplorePage}
      />{" "}
      <Route
        path={`${path}${pathMap["explore"]}`}
        component={ExploreHomePage}
      />{" "}
      <Route
        path={`${path}${pathMap["users"]}/:username/:mediatype?`}
        component={UserProfilePage}
      />{" "}
      <Route
        path={`${path}${pathMap["official"]}/:username/:mediatype?`}
        component={BrandedPartnerPage}
      />{" "}
      <Route path={`${path}${pathMap["packs"]}/:id`} component={PackPage} />{" "}
      <Route
        path={`${path}${pathMap["collections"]}/:id`}
        component={CollectionPage}
      />{" "}
      <Route
        path={`${path}${pathMap["emotional-graph"]}`}
        component={EmotionalGraphPage}
      />{" "}
      <Route
        path={`${path}${pathMap["partners"]}`}
        component={PartnerSpotlightPage}
      />{" "}
      <Route
        path={`${path}${pathMap["contentpartners"]}`}
        component={PartnerSpotlightPage}
      />{" "}
      <Route path={`${path}${pathMap["press"]}`} component={PressPage} />{" "}
      <Route
        path={`${path}${pathMap["about-faq"]}`}
        component={AboutFAQPageRedirect}
      />{" "}
      <Route path={`${path}${pathMap["about-us"]}`} component={AboutUsPage} />{" "}
      <Route path={`${path}${pathMap["imessage"]}`} component={IMessagePage} />{" "}
      <Route path={`${path}${pathMap["contact"]}`} component={ContactPage} />{" "}
      <Route
        path={`${path}${pathMap["legal-terms"]}`}
        component={LegalTermsPage}
      />{" "}
      <Route
        path={`${path}${pathMap["legal-terms-update"]}`}
        component={LegalTermsUpdateRedirect}
      />{" "}
      <Route
        path={`${path}${pathMap["legal-terms-developer-update"]}`}
        component={LegalTermsDeveloperUpdateRedirect}
      />{" "}
      <Route
        path={`${path}${pathMap["legal-privacy"]}`}
        component={LegalPrivacyPage}
      />{" "}
      <Route
        path={`${path}${pathMap["legal-privacy-update"]}`}
        component={LegalPrivacyUpdateRedirect}
      />{" "}
      <Route
        path={`${path}${pathMap["lg-legal-privacy"]}`}
        component={LGLegalPrivacyRedirect}
      />{" "}
      <Route
        path={`${path}${pathMap["lg-legal-data-usage"]}`}
        component={LGLegalDataUsagePage}
      />{" "}
      <Route
        path={`${path}${pathMap["forgot-password"]}`}
        component={ForgotPasswordPage}
      />{" "}
      <Route path={`${path}${pathMap["mac"]}`} component={MacPage} />{" "}
      <Route path="/:shortId*.gif" component={GifPage} />{" "}
      <Route path="*" component={HTTP404Page} />
      <Switch />
    </App>
  );
}

export function routes(history, config, request, response, context) {
  const appGlobals = initConfig(config, PATH, request, response, authService);
  appGlobals.store.register("ui.dataSaverMode", DataSaverModeDataSource);
  appGlobals.store.register("ui.isMobile", IsMobileDataSource);
  appGlobals.store.register("ui.gifSizes.*", GifImgSizesDataSource);
  appGlobals.store.set("ui.dataSaverMode", true);

  if (context) {
    Object.assign(context, appGlobals);
    for (const [key, val] of Object.entries(appGlobals)) {
      context[key] = val;
    }
  }
  setupAnalytics();
  setupAmplio();

  if (process.env.BROWSER) {
    history.listen(function () {
      rootScope.setLocation(history.location);
    });

    window.addEventListener("load", function () {
      const { saveData, effectiveType } = window.navigator.connection || {};
      window.ga("send", "event", {
        eventCategory: "network-speed",
        eventAction: "window.navigator.connection.saveData",
        eventLabel: saveData,
      });
      window.ga("send", "event", {
        eventCategory: "network-speed",
        eventAction: "window.navigator.connection.effectiveType",
        eventLabel: effectiveType,
      });
      let dataSaverMode = false;
      let dataSaverModeRationale = "";
      if (saveData) {
        dataSaverMode = true;
        dataSaverModeRationale = "saveData";
      } else if (
        effectiveType &&
        (effectiveType.endsWith("2g") || effectiveType.endsWith("3g"))
      ) {
        dataSaverMode = true;
        dataSaverModeRationale = "effectiveType";
      } else if (Date.now() - CONSTANTS.START_TS > 3000) {
        dataSaverMode = true;
        dataSaverModeRationale = "window.load speed";
      }
      window.ga("send", "event", {
        eventCategory: "network-speed",
        eventAction: "dataSaverModeRationale",
        eventLabel: dataSaverModeRationale,
      });
      console.log("dataSaverMode", dataSaverMode);
      if (!dataSaverMode) {
        appGlobals.store.set("ui.dataSaverMode", dataSaverMode);
      }
    });
  }
  // FIXME: so this doesn't need to be called manually
  if (typeof history === "string") {
    rootScope.setLocation(history);
  } else {
    rootScope.setLocation(history.location);
  }

  return getRouter(routesForLocale(appGlobals), history, context);
}

// Render HTML if in the browser
runIfInBrowser(routes);
