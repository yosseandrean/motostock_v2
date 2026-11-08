"use client";

/**
 * Submits a POST to the delete route, asking for confirmation first. Cancelling
 * prevents the form submission; the server-side route is the source of truth.
 */
export function DeleteUnitForm({ unitId }: { unitId: number }) {
  return (
    <form
      action={`/api/units/${unitId}/delete`}
      method="post"
      onSubmit={(event) => {
        if (
          !window.confirm("Hapus unit ini? Tindakan ini tidak dapat dibatalkan.")
        ) {
          event.preventDefault();
        }
      }}
    >
      <button type="submit" className="danger-button">
        Hapus
      </button>
    </form>
  );
}
