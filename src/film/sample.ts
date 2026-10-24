import type { Film } from "../engine/types";

// The sample a judge sees first: a 14-second Purrsona launch cut, with a few
// things deliberately left for a director to fix (a soft logo, a rushed title,
// a vague button).
export const sampleFilm: Film = {
  id: "purrsona-launch",
  title: "Purrsona launch",
  width: 1920,
  height: 1080,
  font: "Inter, system-ui, -apple-system, sans-serif",
  brand: {
    purple: "#7c5cff",
    lavender: "#b9a8ff",
    amber: "#ff9f43",
    ink: "#14101f",
    night: "#1b1530",
    white: "#ffffff",
  },
  scenes: [
    {
      id: "intro",
      name: "Intro",
      duration: 3.5,
      background: "#14101f",
      elements: [
        { id: "logo", name: "Purrsona logo", type: "image", src: "/sample/logo.svg", fill: "transparent", x: 960, y: 350, w: 220, h: 220, radius: 52, enter: { preset: "pop", at: 0.2, spring: "default" } },
        { id: "title", name: "Title “Meet Purrsona”", type: "text", text: "Meet Purrsona", size: 128, weight: 800, color: "#ffffff", x: 960, y: 600, w: 1080, h: 150, enter: { preset: "rise", at: 0.35, spring: "snappy" } },
        { id: "subtitle", name: "Subtitle", type: "text", text: "A cat that writes in your voice", size: 52, weight: 500, color: "#b9a8ff", x: 960, y: 730, w: 900, h: 70, enter: { preset: "rise", at: 0.6, spring: "default" } },
      ],
    },
    {
      id: "problem",
      name: "The problem",
      duration: 3.5,
      background: "#1b1530",
      elements: [
        { id: "p-headline", name: "Headline “One message. Three people.”", type: "text", text: "One message. Three people.", size: 80, weight: 800, color: "#ffffff", x: 960, y: 210, w: 1200, h: 110, enter: { preset: "rise", at: 0.1, spring: "heavy" } },
        { id: "chip-1", name: "Chip: to your manager", type: "box", fill: "#262046", radius: 28, text: "Hi Sir, please find the report attached.", size: 36, weight: 500, color: "#ffffff", x: 960, y: 420, w: 940, h: 104, enter: { preset: "slide-left", at: 0.5, spring: "snappy" } },
        { id: "chip-2", name: "Chip: to a college friend", type: "box", fill: "#262046", radius: 28, text: "bro you won't believe what happened today", size: 36, weight: 500, color: "#ffffff", x: 960, y: 560, w: 940, h: 104, enter: { preset: "slide-left", at: 0.8, spring: "snappy" } },
        { id: "chip-3", name: "Chip: to a client", type: "box", fill: "#262046", radius: 28, text: "Dear client, as discussed on our call…", size: 36, weight: 500, color: "#ffffff", x: 960, y: 700, w: 940, h: 104, enter: { preset: "slide-left", at: 1.1, spring: "snappy" } },
        { id: "p-caption", name: "Caption “A chatbot can't tell…”", type: "text", text: "A chatbot can't tell which one is you.", size: 44, weight: 500, color: "#b9a8ff", x: 960, y: 880, w: 1000, h: 64, enter: { preset: "wipe", at: 1.6, spring: "default" } },
      ],
    },
    {
      id: "product",
      name: "The product",
      duration: 4,
      background: "#14101f",
      elements: [
        { id: "d-headline", name: "Headline “Writes like you”", type: "text", text: "Writes like you", size: 92, weight: 800, color: "#ffffff", x: 960, y: 190, w: 1000, h: 120, enter: { preset: "rise", at: 0.1, spring: "heavy" } },
        { id: "d-caption", name: "Caption “Learns from every edit”", type: "text", text: "Learns from every edit you send", size: 42, weight: 500, color: "#b9a8ff", x: 960, y: 290, w: 900, h: 60, enter: { preset: "wipe", at: 0.5, spring: "snappy" } },
        { id: "card", name: "Product screenshot", type: "image", src: "/sample/draft.png", fill: "#ffffff", shadow: true, radius: 24, x: 960, y: 650, w: 1300, h: 505, enter: { preset: "rise", at: 0.7, spring: "default" } },
      ],
    },
    {
      id: "cta",
      name: "Call to action",
      duration: 3,
      background: "#14101f",
      elements: [
        { id: "cta-line", name: "Closing line", type: "text", text: "Plug in. Sound like you.", size: 104, weight: 800, color: "#ffffff", x: 960, y: 440, w: 1300, h: 130, enter: { preset: "rise", at: 0.2, spring: "heavy" } },
        { id: "button", name: "CTA button", type: "box", fill: "#7c5cff", radius: 54, text: "Learn more", size: 44, weight: 700, color: "#ffffff", x: 960, y: 640, w: 440, h: 108, enter: { preset: "pop", at: 0.7, spring: "snappy" } },
      ],
    },
  ],
};

// Notes a judge can load with one click when they don't have Flow or a mic.
export const sampleNotes = [
  { t: 0.9, x: 960, y: 350, sceneId: "intro", elementId: "logo", text: "This logo lands way too soft. Make it hit harder, a bit bigger, and come in a beat earlier." },
  { t: 1.2, x: 960, y: 600, sceneId: "intro", elementId: "title", text: "Title is rushing in, let it breathe. Slower and a little later, after the logo settles." },
  { t: 12.2, x: 960, y: 640, sceneId: "cta", elementId: "button", text: "Button should say Try it free, and make it amber so it pops." },
];
