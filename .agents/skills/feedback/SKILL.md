---
name: feedback
description: "Log user feedback into user_feedback.md as a checklist with resolved/unresolved status. Use when the user asks to record feedback, mark feedback resolved, reopen it, or list the feedback log for a planning session."
disable-model-invocation: true
---

The user is giving feedback about the product. Record it in `user_feedback.md` at the repo root so the list can be read during planning sessions.

## The file

`user_feedback.md` is a Markdown checklist. A checked box means **resolved**; an unchecked box means **open**. Every line is one item:

```markdown
- [ ] YYYY-MM-DD — the feedback, in the user's words
- [x] YYYY-MM-DD — feedback that was resolved (resolved YYYY-MM-DD)
```

If the file is missing, create it with this header and nothing else:

```markdown
# User Feedback

> Log of user feedback for planning. `[x]` = resolved, `[ ]` = open. Manage with `/feedback`.
```

## Commands

Every run starts with the user's argument after the command. If the first word is not one of `add`, `resolve`, `reopen`, `list`, treat the whole argument as feedback text for `add`.

### add

`/feedback <text>` — append one open item.

1. Get today's date: `date +%Y-%m-%d`.
2. Read `user_feedback.md`, creating it with the header above if missing.
3. Append `- [ ] <today> — <text>` on a new line at the end of the checklist.
4. Reply with one line confirming the item you added.

### resolve

`/feedback resolve <selector>` — mark an item resolved.

1. Read `user_feedback.md`.
2. Resolve `<selector>` to one item: a bare number is the 1-based position from `list`; any other text is a substring that must match exactly one item.
3. Zero matches or multiple matches: print the numbered list and ask the user which item. Do not guess.
4. On the matched line, change `- [ ]` to `- [x]` and append ` (resolved <today>)` at the end of the line.
5. Reply with one line confirming the updated item.

### reopen

`/feedback reopen <selector>` — the inverse of resolve: change `- [x]` back to `- [ ]` and remove the trailing ` (resolved YYYY-MM-DD)` note. Same selector rules as resolve.

### list

`/feedback list` — print every item with a 1-based number in front, in file order, so numbers can be used as selectors. If the file is missing or has no items, say "no feedback recorded yet" and do not create the file.

## Rules

- One item per line. Never merge, reorder, or rewrite unrelated lines.
- Keep the user's wording; trim only filler like "I want you to" or "can you please".
- Never delete items — resolve them instead, so the log keeps full history.
