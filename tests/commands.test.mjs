// Voice commands: what Flow writes (capitals, punctuation, number words) has
// to turn into the right command. Run with `npm test`.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createServer } from "vite";

let vite;
let parseCommands;
let parseTime;
let findMoment;

before(async () => {
  vite = await createServer({ configFile: false, logLevel: "silent", server: { middlewareMode: true }, appType: "custom" });
  ({ parseCommands, parseTime, findMoment } = await vite.ssrLoadModule("/src/edit/commands.ts"));
});

after(() => vite?.close());

const one = (said) => {
  const all = parseCommands(said);
  assert.ok(all, `no command in "${said}"`);
  assert.equal(all.length, 1, `one command in "${said}"`);
  return all[0];
};

test("times, as Flow writes them", () => {
  assert.equal(parseTime("0:42"), 42);
  assert.equal(parseTime("1:05"), 65);
  assert.equal(parseTime("42 seconds"), 42);
  assert.equal(parseTime("1.5 seconds"), 1.5);
  assert.equal(parseTime("1 minute 5 seconds"), 65);
  assert.equal(parseTime("1 minute and 5 seconds"), 65);
  assert.equal(parseTime("zero forty-two"), 42);
  assert.equal(parseTime("twelve seconds"), 12);
  assert.equal(parseTime("second 12"), 12);
  assert.equal(parseTime("the 30 second mark"), 30);
  assert.equal(parseTime("the email"), null);
});

test("go to a time, with Flow's capitals and full stop", () => {
  assert.deepEqual(one("Go to 0:42."), { kind: "seek", to: { time: 42 }, play: false });
  assert.deepEqual(one("Jump to 12 seconds"), { kind: "seek", to: { time: 12 }, play: false });
  assert.deepEqual(one("Hey Yappy, go to the end."), { kind: "seek", to: { edge: "end" }, play: false });
  assert.deepEqual(one("Play from the beginning"), { kind: "seek", to: { edge: "start" }, play: true });
  assert.deepEqual(one("Go to the next note."), { kind: "seek", to: { step: "next" }, play: false });
});

test("a moment by what's in it", () => {
  assert.deepEqual(one("Play from the email."), { kind: "seek", to: { what: "the email" }, play: true });
  assert.deepEqual(one("Show me the register button"), { kind: "seek", to: { what: "the register button" }, play: false });
});

test("play, pause and nudges", () => {
  assert.equal(one("Play.").kind, "play");
  assert.equal(one("Pause").kind, "pause");
  assert.deepEqual(one("Back 5 seconds."), { kind: "nudge", by: -5 });
  assert.deepEqual(one("Go back"), { kind: "nudge", by: -5 });
  assert.deepEqual(one("Skip ahead 10 seconds"), { kind: "nudge", by: 10 });
  assert.deepEqual(one("Skip 3 seconds"), { kind: "nudge", by: 3 });
  assert.deepEqual(one("Rewind ten seconds"), { kind: "nudge", by: -10 });
});

test("apply, undo, redo", () => {
  assert.equal(one("Apply.").kind, "apply");
  assert.equal(one("Apply all the notes").kind, "apply");
  assert.equal(one("Okay, apply the changes please.").kind, "apply");
  assert.equal(one("Undo that.").kind, "undo");
  assert.equal(one("Redo").kind, "redo");
});

test("versions: export, view, restore", () => {
  assert.deepEqual(one("Export v3."), { kind: "export", version: 3 });
  assert.deepEqual(one("Export version three"), { kind: "export", version: 3 });
  assert.deepEqual(one("Export"), { kind: "export", version: "current" });
  assert.deepEqual(one("Export the latest version as an MP4"), { kind: "export", version: "latest" });
  assert.deepEqual(one("Export the original"), { kind: "export", version: 1 });
  assert.deepEqual(one("Show v2"), { kind: "view", version: 2 });
  assert.deepEqual(one("Go to version 2"), { kind: "view", version: 2 });
  assert.deepEqual(one("Back to the latest version"), { kind: "view", version: "latest" });
  assert.deepEqual(one("Restore v2."), { kind: "restore", version: 2 });
  assert.equal(parseCommands("Export to YouTube"), null);
});

test("compare with the original footage", () => {
  assert.equal(one("Show the original.").kind, "original");
  assert.equal(one("Compare").kind, "original");
});

test("remove an edit", () => {
  assert.deepEqual(one("Remove the blur."), { kind: "remove", what: "blur" });
  assert.deepEqual(one("Delete this"), { kind: "remove", what: "this" });
});

test("notes keep the words as said", () => {
  assert.deepEqual(one("Note: Zoom in on the prize, 3 seconds."), { kind: "note", text: "Zoom in on the prize, 3 seconds." });
  assert.deepEqual(one("Yappy, blur this email address."), { kind: "note", text: "blur this email address." });
  assert.equal(one("Yappy, apply.").kind, "apply");
});

test("two commands in one breath", () => {
  assert.deepEqual(parseCommands("Go to 0:42 and play."), [
    { kind: "seek", to: { time: 42 }, play: false },
    { kind: "play" },
  ]);
  assert.deepEqual(parseCommands("Apply, then export v3"), [{ kind: "apply" }, { kind: "export", version: 3 }]);
  // Not two commands: the second half isn't one, so it's all one place.
  assert.deepEqual(parseCommands("Play from the email and phone number"), [{ kind: "seek", to: { what: "the email and phone number" }, play: true }]);
});

test("not a command", () => {
  assert.equal(parseCommands("The colours look a bit off here"), null);
  assert.equal(parseCommands("   "), null);
});

test("finding a moment: edits first, then notes, by the words in them", () => {
  const notes = [
    { id: "n1", srcT: 1, x: 0.5, y: 0.5, text: "This opening is just dead air, cut the first two seconds.", author: "You", spoken: true, status: "applied" },
    { id: "n4", srcT: 31, x: 0.2, y: 0.85, text: "Blur this email address, I don't want it in the final video.", author: "You", spoken: true, status: "applied" },
  ];
  const edits = [
    { id: "b", kind: "blur", start: 30.8, end: 32.3, x: 0.2, y: 0.85, w: 0.3, h: 0.06, noteId: "n4" },
    { id: "c", kind: "callout", start: 31.5, end: 34, x: 0.5, y: 0.5, text: "Free to enter" },
  ];
  assert.equal(findMoment("the email", notes, edits).srcT, 31);
  assert.equal(findMoment("the blur", notes, edits).edit.id, "b");
  assert.equal(findMoment("the blurred part", notes, edits).edit.id, "b");
  assert.equal(findMoment("free to enter label", notes, edits).edit.id, "c");
  assert.equal(findMoment("the dead air", notes, edits).srcT, 1);
  assert.equal(findMoment("the dinosaur", notes, edits), null);
});
