// Plays the edited timeline: drives the <video> element through cuts, speed
// changes and holds, keeps the audio routed (so it can be recorded), and
// reports what frame to paint.
import { renderFrame, volumeAt, type FrameState } from "./render";
import { buildTimeline, locate, outDuration, type Segment } from "./timeline";
import type { Edit } from "./types";

export class Player {
  readonly video: HTMLVideoElement;
  edits: Edit[] = [];
  segs: Segment[] = [];
  outT = 0;
  playing = false;
  private duration = 0;
  private last = 0;
  private audio: { ctx: AudioContext; gain: GainNode; record: MediaStreamAudioDestinationNode } | null = null;
  onEnd: (() => void) | null = null;

  constructor(video: HTMLVideoElement) {
    this.video = video;
  }

  load(duration: number, edits: Edit[]) {
    this.duration = duration;
    this.setEdits(edits);
  }

  setEdits(edits: Edit[]) {
    this.edits = edits;
    this.segs = buildTimeline(edits, this.duration);
    this.outT = Math.min(this.outT, Math.max(0, this.length - 0.01));
  }

  get length() {
    return outDuration(this.segs);
  }

  // Web Audio needs a user gesture; route the video through it once, for volume edits and recording.
  private ensureAudio() {
    if (this.audio) return this.audio;
    const ctx = new AudioContext();
    const source = ctx.createMediaElementSource(this.video);
    const gain = ctx.createGain();
    const record = ctx.createMediaStreamDestination();
    source.connect(gain);
    gain.connect(ctx.destination);
    gain.connect(record);
    this.audio = { ctx, gain, record };
    return this.audio;
  }

  recordStream(): MediaStream {
    return this.ensureAudio().record.stream;
  }

  play() {
    if (this.outT >= this.length - 0.05) this.seek(0);
    const a = this.ensureAudio();
    if (a.ctx.state === "suspended") void a.ctx.resume();
    this.playing = true;
    this.last = performance.now();
    this.sync(true);
  }

  pause() {
    this.playing = false;
    this.video.pause();
  }

  seek(outT: number) {
    this.outT = Math.max(0, Math.min(outT, this.length - 0.001));
    this.sync(true);
  }

  // Make the <video> match the timeline position.
  private sync(force = false) {
    const { seg, srcT } = locate(this.segs, this.outT);
    if (force || Math.abs(this.video.currentTime - srcT) > 0.25) this.video.currentTime = srcT;
    if (seg.type === "play") {
      if (this.video.playbackRate !== seg.rate) this.video.playbackRate = seg.rate;
      if (this.playing && this.video.paused) void this.video.play().catch(() => undefined);
      if (!this.playing && !this.video.paused) this.video.pause();
    } else if (!this.video.paused) this.video.pause();
  }

  // Advance one animation frame and return what to draw.
  tick(now: number): FrameState {
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    if (this.playing) {
      const { seg } = locate(this.segs, this.outT);
      if (seg.type === "play") {
        // Follow the video clock so picture and sound stay together.
        const vt = this.video.currentTime;
        if (vt >= seg.src1 - 0.03 || this.video.ended) this.outT = seg.out1 + 0.0005;
        else if (vt >= seg.src0 - 0.3) this.outT = seg.out0 + Math.max(0, vt - seg.src0) / seg.rate;
        else this.outT += dt;
      } else this.outT += dt;
      if (this.outT >= this.length - 0.01) {
        this.outT = this.length - 0.001;
        this.pause();
        this.onEnd?.();
      } else this.sync();
    }
    const { seg, srcT } = locate(this.segs, this.outT);
    const level = volumeAt(this.edits, srcT);
    if (this.audio) this.audio.gain.gain.value = level;
    else this.video.volume = Math.min(1, level);
    if (seg.type === "hold" && seg.edit.kind === "title") return { srcT, title: { edit: seg.edit, local: this.outT - seg.out0 } };
    return { srcT };
  }

  draw(ctx: CanvasRenderingContext2D, W: number, H: number, state: FrameState) {
    renderFrame(ctx, W, H, this.video, this.edits, state);
  }
}
