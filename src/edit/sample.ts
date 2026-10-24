// The sample a judge can open with one click, and notes for judges with no mic.
// The video is a 36 s teaser for the No Hands challenge, made for Yapifier
// (not an official WeMakeDevs or Wispr Flow video), with a few things left
// deliberately rough so every edit type has something to fix.
export const SAMPLE = {
  url: "/samples/no-hands-sample.mp4",
  webm: "/samples/no-hands-sample.webm",
  name: "Sample: No Hands challenge teaser (36 s)",
};

// Some Chromium builds ship without H.264, so fall back to the WebM copy there.
export function sampleUrl(): string {
  const h264 = document.createElement("video").canPlayType('video/mp4; codecs="avc1.64001F, mp4a.40.2"');
  return h264 ? SAMPLE.url : SAMPLE.webm;
}

// srcT in seconds, x/y as fractions of the frame, matched to what's on screen.
export const SAMPLE_NOTES = [
  { srcT: 1.0, x: 0.5, y: 0.45, text: "This opening is just dead air, cut the first two seconds." },
  { srcT: 23.0, x: 0.29, y: 0.5, text: "Zoom in here so people can actually read the judging weights, hold it for about three seconds." },
  { srcT: 27.5, x: 0.42, y: 0.4, text: "Spotlight the prize amount for a couple of seconds." },
  { srcT: 31.0, x: 0.2, y: 0.85, text: "Blur this email address, I don't want it in the final video." },
  { srcT: 31.5, x: 0.5, y: 0.5, text: "Put a label on this button that says Free to enter." },
];
