# Demo recording guide

## Setup

1. Install with the repository lockfile: `bun install` (or `npm install` when Bun is unavailable).
2. Optional production AI variable: `LOVABLE_API_KEY`. It is not required for the deterministic Demo Mode task.
3. Run `npm run dev -- --host 127.0.0.1 --port 4188` (or the Bun equivalent).
4. Run `npm run demo:reset` to print the reset URL.
5. Open `http://127.0.0.1:4188/?demo=true&reset=1`.

Use a 1440 × 900 viewport, 100% browser zoom, hidden bookmarks bar, and no open developer tools. Keep the cursor just below the Cube before narration begins.

## Exact take

1. **Home:** pause at the headline. Drag the Cube roughly 360 px horizontally with a small vertical arc until it opens. Fallback: `Create Flow without spinning`.
2. **Overview:** pause on `Finish PhD thesis chapter`. In the labelled Piece controls below the Cube, select the first `Empty Piece — create a task`, then press `Create task`.
3. **Capture:** the task field is focused. Type exactly `Write the validation methodology chapter`. Press `Break down` once. The acknowledgement appears immediately; six Steps settle after about 1.2 seconds.
4. **Decomposition:** pause on the six Steps. Confirm `Recommended first` reads `Define the validation objectives`. Press `Start recommended Step` once.
5. **Run:** pause on the active Step. Dismiss the one-time hint by pressing `Got it` in the hint. Starting away from the current Step and controls, swipe the open Run surface about 110 px right. Expected: `Clean and summarise validation data`. Swipe the same surface about 110 px left. Expected: the validation methodology task returns. Keep both gestures clearly horizontal.
6. **Step actions:** swipe the current Step row about 100 px right. Expected: a completed state and updated parent Piece count. Swipe the next Step about 100 px left. Expected: `Skip for now` advances without completing or deleting it. Fallback: `Place Piece`, then `Skip for now`.
7. **Reconstruction:** press `Exit` in the header. The Flow overview returns directly. Pause on the updated Piece, then press `Progress`. Hold the final Cube-led Progress frame for 4–6 seconds. Supporting metrics may remain collapsed.

## Recovery and another take

- If a swipe snaps back, use the labelled fallback; do not repeat a shaky gesture on camera.
- If the wrong task is active, swipe the open Run surface left once to restore the previous task.
- If the deterministic Steps do not appear, confirm the URL includes `demo=true`, then reset.
- For another take, reopen `http://127.0.0.1:4188/?demo=true&reset=1`. The reset restores the fixture without deleting the ordinary-data backup.
- Restore the pre-demo local dataset with `http://127.0.0.1:4188/?demo=restore`.
