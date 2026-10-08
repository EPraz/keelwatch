export function CrewPageControls({
  page,
  totalPages,
  label,
  onPage,
}: {
  readonly page: number;
  readonly totalPages: number;
  readonly label: string;
  readonly onPage: (page: number) => void;
}) {
  if (page === 1 && totalPages <= 1) return null;
  return (
    <nav className="form-actions" aria-label={label}>
      <button
        type="button"
        className="button button--secondary"
        disabled={page === 1}
        onClick={() => onPage(page - 1)}
      >
        Previous
      </button>
      <span>
        Page {page} of {Math.max(1, totalPages)}
      </span>
      <button
        type="button"
        className="button button--secondary"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
      >
        Next
      </button>
    </nav>
  );
}
