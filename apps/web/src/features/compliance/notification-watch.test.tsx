import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthSessionContext } from '../../auth/auth-context';
import { NotificationWatch } from './notification-watch';

function renderWatch(canRun: boolean) {
  return render(
    <AuthSessionContext.Provider
      value={{
        status: 'authenticated',
        mode: 'local',
        signIn: () => Promise.resolve(),
        signOut: () => Promise.resolve(),
        getAccessToken: () => Promise.resolve('local.test-token'),
      }}
    >
      <MemoryRouter>
        <NotificationWatch canRun={canRun} />
      </MemoryRouter>
    </AuthSessionContext.Provider>,
  );
}

const queuedRun = {
  id: '50000000-0000-4000-8000-000000000001',
  status: 'QUEUED',
  queuedAt: '2026-10-04T12:00:00.000Z',
  startedAt: null,
  completedAt: null,
  createdCount: 0,
  skippedCount: 0,
  resolvedCount: 0,
  failureCode: null,
};
const emptyWatch = { items: [], total: 0, latestRun: null };

afterEach(() => vi.unstubAllGlobals());

describe('NotificationWatch', () => {
  it('runs a check and renders its reconciled active notifications', async () => {
    const completedRun = {
      ...queuedRun,
      status: 'SUCCEEDED',
      startedAt: '2026-10-04T12:00:01.000Z',
      completedAt: '2026-10-04T12:00:02.000Z',
      createdCount: 1,
    };
    const finalWatch = {
      items: [
        {
          id: '60000000-0000-4000-8000-000000000001',
          vesselId: '10000000-0000-4000-8000-000000000001',
          vesselName: 'MV Northwind',
          registryNumber: 'KW-000001',
          certificateTypeName: 'Safety equipment certificate',
          status: 'MISSING',
          reason: 'Safety equipment certificate is missing.',
          asOf: '2026-10-04',
          createdAt: '2026-10-04T12:00:02.000Z',
        },
      ],
      total: 1,
      latestRun: completedRun,
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json(emptyWatch))
      .mockResolvedValueOnce(Response.json(queuedRun, { status: 202 }))
      .mockResolvedValueOnce(Response.json(completedRun))
      .mockResolvedValueOnce(Response.json(finalWatch));
    vi.stubGlobal('fetch', fetchMock);
    renderWatch(true);

    await screen.findByText(
      'No active notifications. The next check will create only conditions that need attention.',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Run expiry check' }));

    expect(await screen.findByRole('link', { name: 'MV Northwind' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Check complete: 1 new, 0 unchanged, 0 resolved.',
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
    const accessibility = await axe.run(document.body, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(accessibility.violations).toEqual([]);
  });

  it('keeps Auditor access read-only', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(emptyWatch)));
    renderWatch(false);

    expect(await screen.findByText('Read-only delivery log')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Run expiry check' }),
    ).not.toBeInTheDocument();
  });

  it('surfaces a sanitized terminal failure code', async () => {
    const failedRun = {
      ...queuedRun,
      status: 'FAILED',
      startedAt: '2026-10-04T12:00:01.000Z',
      completedAt: '2026-10-04T12:00:02.000Z',
      failureCode: 'COMPLIANCE_NOTIFICATION_JOB_FAILED',
    };
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(Response.json(emptyWatch))
        .mockResolvedValueOnce(Response.json(queuedRun, { status: 202 }))
        .mockResolvedValueOnce(Response.json(failedRun))
        .mockResolvedValueOnce(Response.json({ ...emptyWatch, latestRun: failedRun })),
    );
    renderWatch(true);
    await screen.findByText(
      'No active notifications. The next check will create only conditions that need attention.',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Run expiry check' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'COMPLIANCE_NOTIFICATION_JOB_FAILED',
    );
    expect(screen.queryByText('Synthetic internal detail.')).not.toBeInTheDocument();
  });
});
