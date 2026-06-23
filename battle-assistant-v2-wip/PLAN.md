# Team Manager UX Refresh

## Summary
- Replace the separate `Save` and `Load` buttons on each team with one `Manage Teams` button.
- Open a single OS-style modal that shows the current team preview plus the saved-team list for that side.
- Keep the existing IndexedDB store and record shape so current saved teams continue to work without migration.

## Key Changes
- Top-level action:
  - Rename the per-team action to `Manage Teams` rather than `Save/Load Teams`, since the modal now covers saving, loading, deleting, and conflict resolution.
- Modal layout:
  - Show the current team roster preview at the top.
  - Show the saved teams list below it.
  - Let the user type a nickname to save the current roster as a new saved team.
  - Let the user select an existing saved team and load it.
- Conflict handling:
  - If the typed nickname already exists, present `Merge`, `Overwrite`, `Save As`, and `Cancel`.
  - `Merge` should combine both rosters as a unique union while preserving the current team order first, then adding any saved-only mons.
  - `Overwrite` should replace the existing saved roster with the current one.
  - `Save As` should keep the current contents and prompt for a new nickname.
- Load safety:
  - Loading a saved team should first warn that it will replace the current roster, then proceed if confirmed.
- Browsing helpers:
  - Keep the saved list simple for v1: nickname plus a roster preview.
  - Do not add search, timestamps, or sorting yet unless the list size actually starts to justify it.

## Test Plan
- Verify the new `Manage Teams` button opens the right modal for both `My Team` and `Opponents Team`.
- Verify existing saved teams still appear from IndexedDB with no migration.
- Save a new team with a unique nickname.
- Try saving with a duplicate nickname and confirm all four conflict actions work.
- Load a saved team and confirm the replacement warning appears first.
- Verify `Merge` keeps unique mons from both rosters and does not duplicate entries.
- Verify remove/delete still works from the same modal.
- Verify cancel paths leave the current roster unchanged.

## Assumptions
- Nickname uniqueness stays global because that matches the current IndexedDB keying.
- No backend or storage schema changes are needed.
- The current saved-data format stays lightweight: nickname plus comma-separated mon names.
- A simple saved-team list is enough for now; more file-dialog features can wait until the list actually gets crowded.
