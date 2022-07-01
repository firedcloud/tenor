import cookie from "cookie";

import { ProgressBar } from "./ProgressBar";

import { CustomComponent } from "../components";
import dialog from "../dialog";
import { setupMultivariateTest } from "../multivariatetesting";
import { document, window } from "../util";

export class BaseApp extends CustomComponent {
  constructor(props, context) {
    super(props, context);

    // This is mainly for testing dialogs in dev, not a user feature.
    const query = new URLSearchParams(
      this.context.router.history.location.search
    );
    if (query.has("open-dialog") && process.env.BROWSER) {
      console.log("open-dialog", query.get("open-dialog"));
      const [dialogName, dialogDataStr] = query.get("open-dialog").split(":");
      const dialogData = {};
      if (dialogDataStr) {
        for (const [k, v] of new URLSearchParams(dialogDataStr).entries()) {
          dialogData[k] = v;
        }
      }
      console.log("opening", dialogName, "with data", dialogData);
      window.setTimeout(() => {
        dialog.open(dialogName, dialogData);
      }, 800);
    }
  }
  beforeChildren() {
    return;
  }
  afterChildren() {
    return;
  }
  render() {
    const appGlobals = this.props.staticContext || this.props.appGlobals;

    setupMultivariateTest(this.context, process.env.BROWSER, window.ga);

    this.context.featureFlags = {
      enableAmplioWidgets: true,
      // NB: Static Image Beta "kill switch":
      staticImageBetaEnabled:
        process.env.BROWSER &&
        this.context.arianeMultivariateGroupSelect({
          1: true,
          2: true,
          3: true,
          4: true,
          5: true,
          6: true,
          7: true,
          8: true,
          9: true,
          10: true,
          11: true,
          12: true,
          13: true,
          14: true,
          15: true,
          16: true,
          17: true,
          18: true,
          19: true,
          20: true,
        }),
    };

    // Override feature flags using url query param.
    const query = new URLSearchParams(
      this.context.router.history.location.search
    );
    const enableFeatureFlags = (query.get("enableFeatureFlags") || "").split(
      ","
    );
    for (const flag of enableFeatureFlags) {
      this.context.featureFlags[flag] = true;
    }

    this.context.countryCode =
      process.env.BROWSER &&
      cookie.parse((document && document.cookie) || "").countryCode;

    this.context.request = appGlobals.request;
    this.context.response = appGlobals.response;

    this.context.cacheService = appGlobals.cacheService;
    this.context.apiService = appGlobals.apiService;
    this.context.authService = appGlobals.authService;
    this.context.gtService = appGlobals.gtService;

    this.context.authService &&
      this.context.authService.checkGoogleAccessTokenExpiration &&
      this.context.authService.checkGoogleAccessTokenExpiration(
        this.context.apiService
      );

    this.context.store = appGlobals.store;

    const children = this.props.children;
    const s = children ? <div id="view"> {children} </div> : <div id="view" />;
    return (
      <div className="BaseApp">
        {" "}
        {this.beforeChildren()} {s} <ProgressBar /> {this.afterChildren()}{" "}
      </div>
    );
  }
}
