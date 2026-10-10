import { Toast } from '../../app/toast';
import type { CrewMember } from './crew.api';
import { CrewPageControls } from './crew-page-controls';
import { useCrew } from './use-crew';

export function AssignmentProfilePicker({
  page,
  selected,
  pending,
  invalid,
  onPage,
  onSelect,
}: {
  readonly page: number;
  readonly selected: CrewMember | null;
  readonly pending: boolean;
  readonly invalid: boolean;
  readonly onPage: (page: number) => void;
  readonly onSelect: (member: CrewMember) => void;
}) {
  const crew = useCrew(page);
  return (
    <fieldset disabled={pending}>
      <legend>Crew profile</legend>
      {selected ? (
        <p>
          Selected: {selected.displayName} · {selected.crewNumber}
        </p>
      ) : null}
      {crew.status === 'loading' ? <p role="status">Loading crew profiles…</p> : null}
      {crew.status === 'error' ? (
        <Toast role="alert">
          <p>{crew.message}</p>
          {crew.correlationId ? <p>Reference: {crew.correlationId}</p> : null}
          {crew.httpStatus !== 403 && crew.httpStatus !== 401 ? (
            <button type="button" onClick={crew.retry}>
              Retry profiles
            </button>
          ) : null}
        </Toast>
      ) : null}
      {crew.status === 'success' ? (
        <>
          {crew.data.items.length === 0 ? (
            <p>
              No profiles on this page. Open crew profiles to register one or return to a
              previous page.
            </p>
          ) : null}
          {crew.data.items.map((member) => (
            <label className="checkbox-field" key={member.id}>
              <input
                type="radio"
                name="assignment-profile"
                checked={selected?.id === member.id}
                aria-describedby={invalid ? 'assignment-error' : undefined}
                onChange={() => onSelect(member)}
              />
              {member.displayName} · {member.crewNumber}
            </label>
          ))}
          <CrewPageControls
            page={page}
            totalPages={crew.data.totalPages}
            label="Profile selector pages"
            onPage={onPage}
          />
        </>
      ) : null}
    </fieldset>
  );
}
