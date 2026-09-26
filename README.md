# Resolve

Resolve is a browser-based ear-training and music theory app. It's built around a simple idea: scale highlighting in a DAW can tell you a note is "in the key," but it can't teach you *why* a chord or interval works, or where it wants to go next. Resolve tries to teach that reasoning directly, by ear.

It currently has two modules:

- **Intervals** — what an interval is, a clickable reference chart for all 12 semitone distances, a free-play piano for exploring intervals by ear, and an ear-training quiz that tracks your accuracy over time.
- **Chord Functions** — how the seven diatonic chords (I–vii°) group into tonic, subdominant, and dominant functions, a demo of how each function "pulls" toward resolution, and a matching ear-training quiz.

Two more modules (Progressions, Modes & Color) are stubbed in as "coming soon."

## Files

- [index.html](index.html) — page structure/markup
- [styles.css](styles.css) — all styling
- [script.js](script.js) — app logic (audio synthesis via the Web Audio API, quiz logic, progress tracking, DOM rendering)

This is a split of the original single-file `Resolve_by_Rayann.html` into separate HTML/CSS/JS files, with no behavior changes.

## Running it

Just open [index.html](index.html) in a browser — no build step or server required.

## Note on progress saving

The app persists quiz progress via `window.storage.get`/`window.storage.set` when that host-provided API is available (e.g. the environment this was originally built in). When it isn't — such as opening `index.html` directly as a file — it falls back to `localStorage`, so progress still saves either way.
