import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthSessionContext } from '../../auth/auth-context';
import { OverviewCompliance } from './overview-compliance';

function renderSummary() {
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
        <OverviewCompliance />
      </MemoryRouter>
    </AuthSessionContext.Provider>,
  );
}

function queueResponse(): Response {
  return Response.json({
    asOf: '2026-10-04',
    items: [
      {
        vessel: {
          id: '10000000-0000-4000-8000-000000000001',
          name: 'MV Northwind',
          registryNumber: 'KW-000001',
        },
        status: 'MISSING',
        reason: 'Safety equipment certificate is missing.',
        nextExpiryOn: null,
      },
    ],
    counts: { MISSING: 1, EXPIRED: 1, EXPIRING_SOON: 0, VALID: 2 },
    totalVessels: 4,
    page: 1,
    pageSize: 3,
    total: 4,
    totalPages: 2,
  });
}

afterEach(() => vi.unstubAllGlobals());

describe('OverviewCompliance', () => {
  it('links real risk counts to filtered lists and names the next action', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(queueResponse()));
    renderSummary();

    expect(
      await screen.findByRole('heading', { name: '2 vessels need attention.' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /1\s*Missing/u })).toHaveAttribute(
      'href',
      '/app/compliance?status=MISSING',
    );
    expect(screen.getByRole('link', { name: 'MV Northwind' })).toHaveAttribute(
      'href',
      '/app/vessels/10000000-0000-4000-8000-000000000001',
    );
    const accessibility = await axe.run(document.body, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(accessibility.violations).toEqual([]);
  });

  it('keeps a failed summary visible and retries', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json(
          { code: 'REQUEST_FAILED', message: 'Synthetic summary failure.' },
          { status: 503 },
        ),
      )
      .mockResolvedValueOnce(queueResponse());
    vi.stubGlobal('fetch', fetchMock);
    renderSummary();

    expect(
      await screen.findByRole('heading', { name: 'Compliance summary could not load.' }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(
      await screen.findByRole('heading', { name: '2 vessels need attention.' }),
    ).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
});
