# Battle Roster Workflow Plan

## Summary
The next phase should turn the current battle list into a true battle workspace: cards can be collapsed when a mon faints, cards can be separated by team, the roster can be reordered visually, and whole teams can be saved and restored locally without retyping. Duplicate handling should be team-scoped, so the same mon can exist once on each side.

## Key Changes
1. Card state and controls
- Add a compact icon-only control cluster on each card: `minimize`, `maximize`, and `remove`.
- Keep `remove` as the current `X`, but make `minimize` collapse the card to the first line only and `maximize` restore the full card.
- Track card state in the app model so minimize/maximize is purely view state and does not affect roster order or team membership.
- Keep the current compact card styling, but preserve a clean top-right control area.

2. Team assignment and duplicate rules
- Add a simple team selector when entering a mon: `My Team` or `Opponents Team`.
- Store that team choice on each card as part of the roster state.
- Enforce duplicates only within the chosen team, so `My Team` and `Opponents Team` can both contain the same mon name independently.
- Render the roster as two visually separated groups with a subtle bar/divider between them.

3. Layout and ordering
- Keep the first implementation simple and vertical by default, with an explicit choice for which team appears on top and which appears on bottom.
- Add `move up` and `move down` actions for cards, using the same compact control pattern as the other card buttons.
- Support dragging cards to reorder them within a team.
- After the team-grouped vertical view is stable, add an option to switch the display between stacked and side-by-side team layouts.
- In the side-by-side mode, let the user choose which team appears left/right so the view can line up matchups visually.

4. Save and load teams
- Add browser-local team storage using `IndexedDB`.
- Save only two pieces of data per team: `nickname` and a comma-separated roster list.
- Enforce nickname uniqueness so saved teams are easy to recall and don’t overwrite each other accidentally.
- Add `Save Team` and `Load Team` flows for both `My Team` and `Opponents Team`.
- Loading should replay the current search/add pipeline so saved rosters always use the latest stats and formatting from the library file.
- If a saved mon name no longer exists in the current library, skip it and warn the user instead of breaking the whole load.

## Test Plan
- Card controls:
  - `minimize` collapses a card to the first line only.
  - `maximize` restores the full card.
  - `remove` still deletes the mon from the current roster.
- Team grouping:
  - adding a mon assigns it to `My Team` or `Opponents Team`.
  - duplicate detection is scoped to the selected team only.
  - the visual divider between teams is clear but unobtrusive.
- Reordering:
  - cards can move up/down.
  - drag-and-drop preserves the correct team and order.
- Layouts:
  - the default vertical layout stays usable for fast battle updates.
  - top/bottom mode lets the user choose whether `My Team` or `Opponents Team` appears first.
  - side-by-side mode, when added, preserves team identity and allows left/right choice.
- Save/load:
  - saving prompts for a unique nickname.
  - loading restores the roster from the saved comma-separated list.
  - loaded teams use the current library data, not stale saved stats.
  - duplicate nickname handling is explicit and predictable.

## Assumptions
- The first implementation should keep the default roster layout vertical and use side-by-side as a later enhancement.
- Team saves will live only in the browser via `IndexedDB`, with no server sync.
- Saved rosters will intentionally stay lightweight: nickname plus comma-separated mon names only.
- Collapse state is battle-session UI state, not something that must be restored from saved teams.
- Top/bottom layout choice should be user-selectable so either team can be placed first.
