# Demo QA checklist

## Reset and data

- [ ] Reset URL returns to Home with no visible technical controls.
- [ ] Prepared Flow is `Finish PhD thesis chapter`.
- [ ] `Clean and summarise validation data` has four incomplete Steps.
- [ ] One completed Piece remains visible and inspectable.
- [ ] At least one outlined `Empty Piece — create a task` is available.
- [ ] Repeating reset produces the same state and preserves the ordinary-data backup.

## Golden Path

- [ ] Cube drag and accessible fallback both enter the prepared Flow once.
- [ ] Cube rotation does not accidentally select a Piece.
- [ ] Empty Piece selection reveals `Create task`.
- [ ] Task field receives focus.
- [ ] Exact demo task produces the six expected Steps in about 1.2 seconds.
- [ ] Ordinary tasks still use real AI when configured.
- [ ] `Start recommended Step` starts once with no interval/Cube confirmation.
- [ ] Timer runs; Pause and Resume work.
- [ ] Horizontal Run-surface swipe right reaches the prepared recommended task.
- [ ] Horizontal Run-surface swipe left restores the previous task, Step, timer and pause state.
- [ ] No-previous feedback is calm and non-blocking.
- [ ] Step right swipe and `Place Piece` complete the Step and update the parent Piece.
- [ ] Step left swipe and `Skip for now` defer without completion or deletion.
- [ ] Step gesture never triggers task Shuffle.
- [ ] `Exit` returns to Flow overview.
- [ ] Progress leads with reconstructed Cube and agreeing numeric counts.

## Quality gates

- [ ] No console errors through the full journey.
- [ ] 1440 × 900 primary actions are readable after compression.
- [ ] 320 px and 390 px have no horizontal overflow or covered controls.
- [ ] Long titles and Steps wrap without overlapping controls.
- [ ] Keyboard focus is visible and essential actions are native controls.
- [ ] Cube Pieces have meaningful accessible labels and selection state.
- [ ] `prefers-reduced-motion` removes idle/large travel while preserving state changes.
- [ ] English and Chinese labels remain usable; document language updates.
- [ ] Refresh and reopening the Flow preserve committed task/Step progress.
- [ ] Final frame is calm: Cube, completion counts, one continuation action.
