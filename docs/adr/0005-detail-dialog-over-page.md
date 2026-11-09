# Unit detail as a dialog, not a page

The dedicated Detail Unit page (`/units/[id]`) is removed: clicking a Unit row in any table opens a floating detail dialog with an "Ubah" button to the edit form. Chosen after user feedback found a full page navigation too heavy for a quick look; the old URL now redirects to the edit form.

## Considered Options

- **Keep the page** (previous state): simplest, but a full navigation just to peek at details.
- **Dialog only, delete the page** (chosen): row click opens a modal; Delete moves to the edit form and duplicate warnings render on the edit form.
- **Both**: more code and two places to keep in sync for no user benefit.

## Consequences

- `/units/[id]` returns a redirect to `/units/[id]/edit`, so old bookmarks keep working.
- The Delete action lives on the edit form, not the dialog (keeps destructive actions out of a quick-peek modal).
