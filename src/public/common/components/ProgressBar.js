import { autobind } from "core-decorators";

import emitter from "tiny-emitter/instance";

import { Component } from "inferno"; // eslint-disable-line no-unused-vars

import { CustomComponent } from "../components";

import "./ProgressBar.scss";

export class ProgressBar extends CustomComponent {
  constructor(props, context) {
    super(props, context);
    this.state.hide = true;
    this.state.progress = 0;
    this.state.duration = 2000;
  }

  componentDidMount() {
    emitter.on("start-progress-bar", this.startProgress);
    emitter.on("finish-progress-bar", this.finishProgress);
  }

  componentWillUnmount() {
    emitter.off("start-progress-bar", this.startProgress);
    emitter.off("finish-progress-bar", this.finishProgress);
  }

  @autobind
  startProgress() {
    this.started = true;
    this.state.hide = false;
    this.state.progress = 95;
    this.state.duration = 2000;
    this.triggerUpdate();
  }

  @autobind
  finishProgress() {
    if (this.started) {
      this.started = false;
      this.state.hide = false;
      this.state.progress = 100;
      this.state.duration = 300;
      this.triggerUpdate();
      setTimeout(() => {
        this.state.hide = true;
        this.state.progress = 0;
        this.triggerUpdate();
      }, 400);
    }
  }

  render() {
    const { progress, hide, duration } = this.state;
    return (
      <div
        className="ProgressBar"
        style={{
          height: hide ? "0" : "3px",
          right: `${100 - progress}vw`,
          transition: `right ${duration / 1000}s linear`,
        }}
      />
    );
  }
}
