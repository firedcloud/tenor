import { BaseProfilePage } from "./profileBase";
import { ProfilePageHeader } from "../components/ProfilePageHeader";

import { Component } from "inferno"; // eslint-disable-line no-unused-vars

import { Metadata } from "../../common/metadata";
import { Link } from "../../common/components";
import authService from "../../common/services/authService";
import { getArticleLDJSON, safelySerializeJSON } from "../../common/util";

import { subscribe, transformProps } from "../../../replete";

import { FloatingTwgButton } from "../components/amplio";

import "./profile.scss";

@transformProps((props) => {
  props.username = decodeURIComponent(props.match.params.username);
  props.mediatype = props.match.params.mediatype;
  props.ownsProfile = authService.ownsProfile(props.username);

  return props;
})
@subscribe({
  pageState: ["ui.ProfilePage.*", "username"],
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
export class UserProfilePage extends BaseProfilePage {
  renderPage() {
    if (this.props.profile.pending) {
      return <div> </div>;
    }
    const gettextSub = this.context.gtService.gettextSub;

    this.prepareGifAndStickerLists();

    let articleLDJSON = {};
    // we don't want to use unprocessed GIFs
    if (this.props.gifs.results.length) {
      articleLDJSON = getArticleLDJSON(this, this.props.gifs.results[0]);
    }
    this.noindex = true;
    const noUploads =
      this.props.gifs.loaded &&
      !this.gifList.length &&
      this.props.stickers.loaded &&
      !this.stickerList.length;

    this.profilePageView =
      this.props.section === this.PROFILE && !this.props.mediatype;
    this.favoritesPageView =
      this.props.section === this.FAVORITES && !this.props.mediatype;
    this.stickerPageView = this.props.mediatype === this.STICKERS;

    return (
      <div>
        <Metadata page={this}>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: safelySerializeJSON(articleLDJSON),
            }}
          />{" "}
        </Metadata>{" "}
        <div
          className={`ProfilePage page${this.props.ownsProfile ? " self" : ""}`}
        >
          <FloatingTwgButton username={this.props.username} title={""} />{" "}
          <ProfilePageHeader
            profile={this.user}
            fullProfile={this.fullProfile}
          />{" "}
          <div className="container">
            {" "}
            {this.profilePageView && (
              <div className="content">
                {" "}
                {this.props.ownsProfile && (
                  <div className="switch-view-link">
                    <a onClick={() => this.setSection(this.FAVORITES)}>
                      {" "}
                      {gettextSub("View Favorites")}{" "}
                    </a>{" "}
                  </div>
                )}{" "}
                {this.stickerList.length > 0 && this.renderStickerListSection()}{" "}
                {this.gifList.length > 0 && this.renderGifListSection()}{" "}
                {noUploads && this.props.ownsProfile && (
                  <div className="no-gifs">
                    <img
                      className="img1"
                      src="https://media1.tenor.com/images/ac232c5dc7777b2a71dbec2b33aabc48/tenor.gif?itemid=4355705"
                      width="193"
                      height="103"
                    />
                    <img
                      className="img2"
                      src="https://media1.tenor.com/images/ea0335a92ad2f327d79a7435b3352378/tenor.gif?itemid=5174159"
                      width="173"
                      height="105"
                    />
                    <img
                      className="img3"
                      src="https://media1.tenor.com/images/7ae535f039842e4e91c4e394e5f486f6/tenor.gif?itemid=4968320"
                      width="159"
                      height="130"
                    />
                    <h2> {gettextSub("Upload your favorite GIFs!")} </h2>{" "}
                    <p>
                      {" "}
                      {gettextSub(
                        "Upload GIFs and you’ll get notifications when people share or favorite them"
                      )}{" "}
                    </p>{" "}
                    <Link
                      to={
                        "/gif-maker?utm_source=empty-profile&utm_medium=internal&utm_campaign=gif-maker-entrypoints"
                      }
                      className="button"
                    >
                      {" "}
                      {gettextSub("Upload")}{" "}
                    </Link>{" "}
                  </div>
                )}{" "}
                {noUploads && !this.props.ownsProfile && (
                  <div className="no-gifs">
                    <img
                      className="img1"
                      src="https://media1.tenor.com/images/566372134dfaf5631e2914a8161a4cc5/tenor.gif?itemid=5173996"
                      width="193"
                      height="103"
                    />
                    <img
                      className="img2"
                      src="https://media1.tenor.com/images/b3a4ffcad4739f86911550d0d5ee7d24/tenor.gif?itemid=5578688"
                      width="173"
                      height="105"
                    />
                    <img
                      className="img3"
                      src="https://media1.tenor.com/images/1d66e7ff090092e8f3d2ed24db4c8fc8/tenor.gif?itemid=5337071"
                      width="159"
                      height="130"
                    />
                    <h2>
                      {" "}
                      {gettextSub("{username} hasn’t uploaded any GIFs!", {
                        username: this.props.username,
                      })}{" "}
                    </h2>{" "}
                  </div>
                )}{" "}
              </div>
            )}{" "}
            {this.favoritesPageView && (
              <div className="content">
                {" "}
                {this.props.ownsProfile && (
                  <div className="switch-view-link">
                    <a onClick={() => this.setSection(this.PROFILE)}>
                      {" "}
                      {gettextSub("View Uploads")}{" "}
                    </a>{" "}
                  </div>
                )}{" "}
                {this.renderGifListSection()}{" "}
              </div>
            )}{" "}
            {this.stickerPageView && (
              <div className="content">
                {" "}
                {this.renderStickerListSection()}{" "}
                {this.props.isMobile && this.renderGifListSection()}{" "}
              </div>
            )}{" "}
          </div>{" "}
        </div>{" "}
      </div>
    );
  }
}
