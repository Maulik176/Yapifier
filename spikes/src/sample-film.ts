import type { Film } from "./engine";

// A 10-second Purrsona sample, three scenes. Assets are Maulik's own.
export const sampleFilm: Film = {
  width: 1920,
  height: 1080,
  duration: 10,
  font: "Inter, system-ui, -apple-system, sans-serif",
  scenes: [
    {
      id: "intro",
      start: 0,
      duration: 4,
      background: "#14101f",
      elements: [
        { id: "logo", name: "Purrsona logo", type: "image", src: "/logo.png", x: 960, y: 380, w: 200, h: 200, radius: 40, enter: { preset: "pop", at: 0.2, spring: "default" } },
        { id: "title", name: "Title: Meet Purrsona", type: "text", text: "Meet Purrsona", size: 120, weight: 800, color: "#ffffff", x: 960, y: 620, w: 900, h: 140, enter: { preset: "rise", at: 0.6, spring: "heavy" } },
        { id: "subtitle", name: "Subtitle", type: "text", text: "Replies that sound like you", size: 52, weight: 500, color: "#b9a8ff", x: 960, y: 740, w: 900, h: 70, enter: { preset: "rise", at: 1.0, spring: "default" } },
      ],
    },
    {
      id: "product",
      start: 4,
      duration: 4,
      background: "#1b1530",
      elements: [
        { id: "card", name: "Product screenshot", type: "image", src: "/screen.png", x: 1180, y: 540, w: 900, h: 620, radius: 28, enter: { preset: "slide-left", at: 0.1, spring: "default" } },
        { id: "headline", name: "Headline: Writes like you", type: "text", text: "Writes like you", size: 88, weight: 800, color: "#ffffff", x: 470, y: 470, w: 700, h: 110, enter: { preset: "rise", at: 0.4, spring: "heavy" } },
        { id: "caption", name: "Caption", type: "text", text: "Learns from every edit", size: 44, weight: 500, color: "#b9a8ff", x: 470, y: 570, w: 700, h: 60, enter: { preset: "wipe", at: 0.9, spring: "snappy" } },
      ],
    },
    {
      id: "cta",
      start: 8,
      duration: 2,
      background: "#14101f",
      elements: [
        { id: "cta-line", name: "Closing line", type: "text", text: "Plug in. Sound like you.", size: 96, weight: 800, color: "#ffffff", x: 960, y: 470, w: 1300, h: 120, enter: { preset: "rise", at: 0.1, spring: "heavy" } },
        { id: "button", name: "CTA button", type: "rect", fill: "#7c5cff", radius: 44, text: "Try Purrsona", size: 44, weight: 700, color: "#ffffff", x: 960, y: 640, w: 420, h: 96, enter: { preset: "pop", at: 0.5, spring: "snappy" } },
      ],
    },
  ],
};
