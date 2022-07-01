import { Component } from "inferno"; // eslint-disable-line no-unused-vars

import { Page } from "../../../common/components";

export class AboutFAQPageRedirect extends Page {
  pageInit() {
    this.redirect("https://support.google.com/tenor");
  }
}
