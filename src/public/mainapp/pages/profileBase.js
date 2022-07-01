import { autobind } from "core-decorators";

import emitter from "tiny-emitter/instance";

import { Component } from "inferno"; // eslint-disable-line no-unused-vars

import { Page, Link } from "../../common/components";
import { CONSTANTS } from "../../common/config";
import { isSticker } from "../../common/util";

import uploadService from "../../common/services/uploadService";

import { GifList } from "../components/GifList";
import { Carousel } from "../components/Carousel";

import "./profile.scss";

export class BaseProfilePage extends Page {
  pageChanged(nextProps) {
    return (
      nextProps.username !== this.props.username ||
      nextProps.section !== this.props.section
    );
  }
  propsNeedProcessing(nextProps) {
    for (const key of ["profile", "gifs", "stickers"]) {
      if (nextProps[key] !== this.props[key]) {
        return true;
      }
    }
    return false;
  }
  pageInit(props) {
    this.ttl = CONSTANTS.PROFILE_PAGE_TTL;

    this.PROFILE = "profile";
    this.FAVORITES = "favorites";
    this.STICKERS = "stickers";

    this.title = "";
    this.description = "";
    this.h1_title = props.username;
  }
  processNewProps(props) {
    this.handleProfileBody(props);
    this.done(props);
  }
  componentWillMount() {
    uploadService.clearProcessed();
  }
  componentDidMount() {
    emitter.on("uploads-processed", this.triggerUpdate);
  }
  componentWillUnmount() {
    emitter.off("uploads-processed", this.triggerUpdate);
  }

  @autobind
  trackSeeAllContentTap(mediaType) {
    return () => {
      this.context.apiService.trackSeeAllContentTap(mediaType, "profile");
    };
  }

  handleProfileBody(props) {
    const gettextSub = this.context.gtService.gettextSub;
    const body = props.profile;
    this.user = body.user;
    this.fullProfile = body;

    if (!props.profile.pending) {
      if (!this.user || this.user.userid === -1) {
        this.context.response.status = 404;
        return;
      }

      this.setCanonicalURL(this.linkToProfile(this.user, this.props.mediatype));
      this.title = gettextSub("{username}'s GIFs on Tenor", {
        username: this.user.username,
      });
      this.description = gettextSub(
        "Check out {username}'s GIFs on Tenor. Discover, search and share popular GIFs with friends on Tenor.",
        {
          username: this.user.username,
        }
      );
    }
  }

  done() {
    if (!uploadService.fetchingInProgress && this.props.ownsProfile) {
      console.log("upload fetch in progress");
      uploadService.fetchUnprocessed(this.context.apiService);
    }
  }

  @autobind
  handlePageDone() {
    super.handlePageDone();
    this.context.apiService.registerEvent("profile_page_view", {
      partner_profile: this.user.usertype === "user" ? "" : this.user.username,
      usertype: this.user.usertype,
    });
  }
  @autobind
  getMoreGifs() {
    this.context.store.call(
      "api.gifs.searchByUsername.*",
      [this.props.username, this.props.section, this.props.ownsProfile],
      "more"
    );
  }
  @autobind
  getMoreStickers() {
    this.context.store.call(
      "api.stickers.searchByUsername.*",
      [this.props.username, this.props.section, this.props.ownsProfile],
      "more"
    );
  }

  @autobind
  setSection(section) {
    this.context.store.set(
      "ui.ProfilePage.*.section",
      [this.props.username],
      section
    );
  }

  prepareGifAndStickerLists() {
    this.gifList = [].concat(this.props.gifs.results);
    this.stickerList = [].concat(this.props.stickers.results);
    const unprocessedGifs = [];
    let processedGifs = [];

    if (this.props.ownsProfile) {
      for (const id in uploadService.unprocessedUploads) {
        if (this.gifList.some((gif) => gif.id === id)) {
          uploadService.removeUnprocessedUpload(id);
        } else {
          unprocessedGifs.push(uploadService.unprocessedUploads[id]);
        }
      }
      for (const id in uploadService.processedUploads) {
        if (this.gifList.some((gif) => gif.id === id)) {
          uploadService.removeProcessedUpload(id);
        } else {
          processedGifs.push(uploadService.processedUploads[id]);
        }
      }
    }
    if (this.props.section === this.PROFILE) {
      const processedStickers = [];
      processedGifs = processedGifs.filter((gif) => {
        const sticker = isSticker(gif);
        if (sticker) {
          processedStickers.push(gif);
        }
        return !sticker;
      });
      this.stickerList = [].concat(processedStickers, this.stickerList);
      this.gifList = [].concat(unprocessedGifs, processedGifs, this.gifList);
    }
    if (unprocessedGifs.length && !uploadService.fetchingInProgress) {
      uploadService.fetchUnprocessed(this.context.apiService);
    }
  }

  renderGifListSection() {
    const gettextSub = this.context.gtService.gettextSub;
    const { usertype, username, partnername } = this.user;
    const isPartner = usertype === "partner";

    let header;
    if (this.profilePageView || this.stickerPageView) {
      header = `${isPartner ? partnername : username} GIFs`;
    } else if (this.favoritesPageView) {
      header = gettextSub("Favorites");
    }

    return (
      <div className="media-section">
        <div className="media-section-header">
          <h2> {header} </h2>{" "}
        </div>{" "}
        <GifList
          gifs={this.gifList}
          loaded={this.props.gifs.loaded}
          pending={this.props.gifs.pending}
          itemsExhaustedCallback={this.getMoreGifs}
        />{" "}
      </div>
    );
  }

  renderStickerListSection() {
    const gettextSub = this.context.gtService.gettextSub;
    const { usertype, username, partnername } = this.user;
    const isPartner = usertype === "partner";
    const header = `${isPartner ? partnername : username} ${gettextSub(
      "Stickers"
    )}`;

    return (
      <div className="media-section">
        <div className="media-section-header">
          <h2> {header} </h2>{" "}
          {this.stickerPageView && (
            <Link
              onClick={this.trackSeeAllContentTap("gifs")}
              to={`/${isPartner ? "official" : "users"}/${this.props.username}`}
            >
              {" "}
              {gettextSub("See GIFs")}{" "}
            </Link>
          )}{" "}
          {!this.stickerPageView && (
            <Link
              onClick={this.trackSeeAllContentTap("stickers")}
              to={`/${isPartner ? "official" : "users"}/${
                this.props.username
              }/stickers`}
            >
              {" "}
              {gettextSub("See all")}{" "}
            </Link>
          )}{" "}
        </div>{" "}
        {this.stickerList.length > 0 && this.stickerPageView && (
          <GifList
            className="stickers"
            gifs={this.stickerList}
            loaded={this.props.stickers.loaded}
            pending={this.props.stickers.pending}
            itemsExhaustedCallback={this.getMoreStickers}
          />
        )}{" "}
        {this.stickerList.length > 0 &&
          this.profilePageView &&
          this.props.isMobile && (
            <GifList
              className="stickers"
              gifs={this.stickerList.slice(0, 6)}
              loaded={this.props.stickers.loaded}
              pending={this.props.stickers.pending}
              staticColumns={3}
            />
          )}{" "}
        {this.stickerList.length > 0 &&
          this.profilePageView &&
          !this.props.isMobile && (
            <Carousel
              items={this.stickerList}
              type={"stickers"}
              itemsExhaustedCallback={this.getMoreStickers}
            />
          )}{" "}
      </div>
    );
  }
}
