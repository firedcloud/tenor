import { Component } from "inferno"; // eslint-disable-line no-unused-vars

import { Link, CustomComponent } from "../../common/components";
import { Metadata } from "../../common/metadata";
import authService from "../../common/services/authService";
import {
  escapeQuotes,
  getArticleLDJSON,
  safelySerializeJSON,
} from "../../common/util";

import { BaseProfilePage } from "./profileBase";
import { FloatingTwgButton } from "../components/amplio";
import { ProfilePageHeader } from "../components/ProfilePageHeader";
import { gifOGMeta } from "../components/gifOGMeta";
import { UpsellPill } from "../components/UpsellPill";

import { subscribe, transformProps } from "../../../replete";

import "./profile.scss";

class LinkTag extends CustomComponent {
  render() {
    const { image, url, name } = this.props;
    return (
      <Link to={url}>
        <div
          className="LinkTag"
          style={{
            backgroundImage: `linear-gradient(rgba(23,23,23,0.5), rgba(23,23,23,0.5)), ${escapeQuotes(
              `url("${image}")`
            )}`,
          }}
        >
          <span className="term"> {name} </span>{" "}
        </div>{" "}
      </Link>
    );
  }
}

export class BrandedPartnerCategory extends CustomComponent {
  render() {
    const { category, profile } = this.props;
    return (
      <div className="BrandedPartnerCategory">
        <h2 className="non-mobile-only"> {category.title} </h2>{" "}
        <div className="category-links-list">
          {" "}
          {category.links.map((link, i) => {
            const { name, url, image, packid } = link;
            let imageUrl = image;
            if (profile.partnerbanner) {
              imageUrl = image || profile.partnerbanner[690];
            }
            let defaultUrl = `/official/${profile.username}/${category.slug}/${link.slug}`;
            if (packid) {
              defaultUrl = `/packs/${packid}`;
            }
            return (
              <LinkTag
                key={i}
                image={imageUrl}
                url={url || defaultUrl}
                name={name}
              />
            );
          })}{" "}
        </div>{" "}
      </div>
    );
  }
}

@transformProps((props) => {
  props.username = decodeURIComponent(props.match.params.username);
  props.mediatype = props.match.params.mediatype;
  props.ownsProfile = authService.ownsProfile(props.username);

  return props;
})
@subscribe({
  pageState: ["ui.BrandedPartnerPage.*", "username"],
  isMobile: ["ui.isMobile"],
})
@transformProps((props) => {
  props.section = props.pageState.section;

  return props;
})
@subscribe({
  profile: ["api.profiles.*", "username"],
  gifs: ["api.gifs.searchByUsername.*", "username", "section", "ownsProfile"],
  stickers: [
    "api.stickers.searchByUsername.*",
    "username",
    "section",
    "ownsProfile",
  ],
})
export class BrandedPartnerPage extends BaseProfilePage {
  renderPage() {
    if (this.props.profile.pending) {
      return <div> </div>;
    }
    this.prepareGifAndStickerLists();

    let articleLDJSON = {};
    if (this.props.gifs.results.length) {
      articleLDJSON = getArticleLDJSON(this, this.props.gifs.results[0]);
    }

    this.profilePageView =
      this.props.section === this.PROFILE && !this.props.mediatype;
    this.stickerPageView = this.props.mediatype === this.STICKERS;

    return (
      <div>
        <Metadata page={this}>
          {" "}
          {gifOGMeta(this.props.gifs.results)}{" "}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: safelySerializeJSON(articleLDJSON),
            }}
          />{" "}
        </Metadata>
        {this.user && this.user.usertype === "partner" && (
          <div className={"BrandedPartnerPage page"}>
            <FloatingTwgButton username={this.user.username} title={""} />{" "}
            <ProfilePageHeader
              profile={this.user}
              fullProfile={this.fullProfile}
            />{" "}
            <div className="container">
              {" "}
              {this.profilePageView && (
                <div className="content">
                  {" "}
                  {this.user.partnercategories &&
                    this.user.partnercategories.map((category, i) => {
                      return (
                        <BrandedPartnerCategory
                          key={i}
                          profile={this.user}
                          category={category}
                        />
                      );
                    })}{" "}
                  {this.stickerList.length > 0 &&
                    this.renderStickerListSection()}{" "}
                  {this.gifList.length > 0 && this.renderGifListSection()}{" "}
                </div>
              )}{" "}
              {this.stickerPageView && (
                <div className="content">
                  {" "}
                  {this.renderStickerListSection()}{" "}
                  {this.props.isMobile && this.renderGifListSection()}{" "}
                </div>
              )}{" "}
              <UpsellPill origin="bpp" />
            </div>{" "}
          </div>
        )}{" "}
      </div>
    );
  }
}
