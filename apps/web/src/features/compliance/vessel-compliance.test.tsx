import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthSessionContext } from '../../auth/auth-context';
import type { ComplianceWorkspace } from './compliance.types';
import { VesselCompliance } from './vessel-compliance';

const vesselId = '10000000-0000-4000-8000-000000000001';
const certificateType = {
  code: 'SAFETY_EQUIPMENT',
  name: 'Safety equipment certificate',
  isRequired: true,
};
const missingWorkspace: ComplianceWorkspace = {
  asOf: '2026-10-03',
  status: 'MISSING',
  reason: 'Safety equipment certificate is missing.',
  requirements: [
    {
      certificateType,
      status: 'MISSING',
      reason: 'Safety equipment certificate is missing.',
      certificate: null,
    },
  ],
  certificates: [],
  certificateTypes: [certificateType],
};
const validWorkspace: ComplianceWorkspace = {
  ...missingWorkspace,
  status: 'VALID',
  reason: 'Safety equipment certificate is valid until 2027-09-01.',
  certificates: [
    {
      id: '40000000-0000-4000-8000-000000000001',
      certificateTypeCode: certificateType.code,
      certificateTypeName: certificateType.name,
      referenceNumber: 'SE-2026-0001',
      issuer: 'Northstar Safety Registry',
      issuedOn: '2026-09-01',
      expiresOn: '2027-09-01',
      createdAt: '2026-10-03T12:00:00.000Z',
      updatedAt: '2026-10-03T12:00:00.000Z',
      archivedAt: null,
    },
  ],
  requirements: [
    {
      certificateType,
      status: 'VALID',
      reason: 'Safety equipment certificate is valid until 2027-09-01.',
      certificate: null,
    },
  ],
};

const updatedWorkspace: ComplianceWorkspace = {
  ...validWorkspace,
  certificates: validWorkspace.certificates.map((certificate) => ({
    ...certificate,
    issuer: 'Northstar Registry Updated',
    updatedAt: '2026-10-04T12:00:00.000Z',
  })),
};

const archivedWorkspace: ComplianceWorkspace = {
  ...missingWorkspace,
  certificates: validWorkspace.certificates.map((certificate) => ({
    ...certificate,
    archivedAt: '2026-10-04T12:00:00.000Z',
    updatedAt: '2026-10-04T12:00:00.000Z',
  })),
};

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function renderCompliance(canWrite = true) {
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
        <VesselCompliance
          vesselId={vesselId}
          canWrite={canWrite}
          onCertificateCreated={vi.fn()}
        />
      </MemoryRouter>
    </AuthSessionContext.Provider>,
  );
}

async function fillValidForm() {
  await userEvent.type(
    screen.getByRole('textbox', { name: 'Reference' }),
    'SE-2026-0001',
  );
  await userEvent.type(
    screen.getByRole('textbox', { name: 'Issuer' }),
    'Northstar Safety Registry',
  );
  await userEvent.type(screen.getByLabelText('Issued on'), '2026-09-01');
  await userEvent.type(screen.getByLabelText('Expires on'), '2027-09-01');
}

afterEach(() => vi.unstubAllGlobals());

describe('VesselCompliance', () => {
  it.each([true, false])(
    'explains disabled attachments for canWrite=%s',
    async (canWrite) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(validWorkspace)));
      const { container } = renderCompliance(canWrite);
      expect(
        await screen.findByText(/File uploads and downloads are disabled/u),
      ).toBeInTheDocument();
      expect(screen.getByText('SE-2026-0001')).toBeInTheDocument();
      expect(container.querySelector('input[type="file"]')).toBeNull();
      expect(
        screen.queryByRole('button', { name: /upload|download|file check/iu }),
      ).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /download/iu })).not.toBeInTheDocument();
    },
  );

  it('renders a loading state before evidence arrives', () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => undefined)));
    renderCompliance();
    expect(screen.getByLabelText('Loading compliance status')).toBeInTheDocument();
  });

  it('explains missing evidence and its empty history accessibly', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(missingWorkspace)));
    renderCompliance();

    expect(
      await screen.findByRole('heading', { name: 'Evidence missing' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Safety equipment certificate is missing.'),
    ).toBeInTheDocument();
    expect(screen.getByText('No certificate evidence yet.')).toBeInTheDocument();
    const accessibility = await axe.run(document.body, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(accessibility.violations).toEqual([]);
  });

  it('shows calendar and range errors, preserves values, and moves focus to the summary', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(missingWorkspace)));
    renderCompliance();
    await screen.findByRole('button', { name: 'Record certificate' });
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Reference' }),
      'SE-INVALID',
    );
    await userEvent.type(screen.getByRole('textbox', { name: 'Issuer' }), 'Northstar');
    await userEvent.type(screen.getByLabelText('Issued on'), '2027-09-02');
    await userEvent.type(screen.getByLabelText('Expires on'), '2027-09-01');
    await userEvent.click(screen.getByRole('button', { name: 'Record certificate' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveFocus();
    expect(
      screen.getByText('Issued on must be on or before expires on.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Reference' })).toHaveValue('SE-INVALID');
  });

  it('disables duplicate submit, announces success, and renders returned history', async () => {
    let resolvePost: ((response: Response) => void) | undefined;
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') {
        return new Promise<Response>((resolve) => {
          resolvePost = resolve;
        });
      }
      return Promise.resolve(Response.json(missingWorkspace));
    });
    vi.stubGlobal('fetch', fetchMock);
    renderCompliance();
    await screen.findByRole('button', { name: 'Record certificate' });
    await fillValidForm();
    await userEvent.click(screen.getByRole('button', { name: 'Record certificate' }));
    expect(screen.getByRole('button', { name: 'Recording certificate…' })).toBeDisabled();
    resolvePost?.(Response.json(validWorkspace, { status: 201 }));

    const success = await screen.findByRole('status');
    expect(success.closest('[role="status"]')).toHaveClass('toast');
    expect(screen.getByRole('heading', { name: 'Valid' })).toBeInTheDocument();
    expect(screen.getByText('SE-2026-0001')).toBeInTheDocument();
  });

  it('surfaces a duplicate conflict at the reference and keeps the form', async () => {
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
      Promise.resolve(
        init?.method === 'POST'
          ? Response.json(
              {
                code: 'CERTIFICATE_REFERENCE_CONFLICT',
                message:
                  'This certificate reference is already recorded for this vessel and type.',
                fieldErrors: {
                  referenceNumber: ['Use a unique reference for this vessel and type.'],
                },
                correlationId: 'duplicate-certificate-test',
              },
              { status: 409 },
            )
          : Response.json(missingWorkspace),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    renderCompliance();
    await screen.findByRole('button', { name: 'Record certificate' });
    await fillValidForm();
    await userEvent.click(screen.getByRole('button', { name: 'Record certificate' }));

    expect(
      await screen.findByText('Use a unique reference for this vessel and type.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Reference' })).toHaveValue(
      'SE-2026-0001',
    );
    expect(screen.getByText('Reference: duplicate-certificate-test')).toBeInTheDocument();
  });

  it('surfaces a server-forbidden write without clearing certificate details', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
        Promise.resolve(
          init?.method === 'POST'
            ? Response.json(
                {
                  code: 'PERMISSION_DENIED',
                  message: 'You do not have permission to perform this action.',
                },
                { status: 403 },
              )
            : Response.json(missingWorkspace),
        ),
      ),
    );
    renderCompliance();
    await screen.findByRole('button', { name: 'Record certificate' });
    await fillValidForm();
    await userEvent.click(screen.getByRole('button', { name: 'Record certificate' }));
    expect(
      await screen.findByText('You do not have permission to perform this action.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Reference' })).toHaveValue(
      'SE-2026-0001',
    );
  });

  it('shows an Auditor the history without any mutation control', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(validWorkspace)));
    renderCompliance(false);
    expect(
      await screen.findByRole('heading', { name: 'Evidence is visible, not editable.' }),
    ).toBeInTheDocument();
    expect(screen.getByText('SE-2026-0001')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Record certificate' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Edit SE-/u })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Archive SE-/u }),
    ).not.toBeInTheDocument();
  });

  it('edits certificate evidence and announces the saved result', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
        Promise.resolve(
          init?.method === 'PUT'
            ? Response.json(updatedWorkspace)
            : Response.json(validWorkspace),
        ),
      ),
    );
    renderCompliance();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Edit SE-2026-0001' }),
    );
    const saveButton = screen.getByRole('button', { name: 'Save changes' });
    const editForm = saveButton.closest('form');
    expect(editForm).not.toBeNull();
    const issuer = within(editForm!).getByRole('textbox', { name: 'Issuer' });
    await userEvent.clear(issuer);
    await userEvent.type(issuer, 'Northstar Registry Updated');
    await userEvent.click(saveButton);

    expect(await screen.findByText('Certificate updated.')).toBeInTheDocument();
    expect(screen.getByText('Northstar Registry Updated')).toBeInTheDocument();
  });

  it('requires explicit confirmation before archiving evidence', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL, init?: RequestInit) =>
        Promise.resolve(
          init?.method === 'POST' && requestUrl(input).endsWith('/archive')
            ? Response.json(archivedWorkspace)
            : Response.json(validWorkspace),
        ),
      ),
    );
    renderCompliance();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Archive SE-2026-0001' }),
    );
    expect(
      screen.getByRole('group', { name: 'Archive certificate' }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Confirm archive' }));

    expect(
      await screen.findByRole('heading', { name: 'Evidence missing' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Archived')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Certificate archived. It remains in history and no longer affects status.',
      ),
    ).toBeInTheDocument();
  });

  it('recovers a persistent network failure after dismissing its notification', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Network unavailable'))
      .mockResolvedValueOnce(Response.json(missingWorkspace));
    vi.stubGlobal('fetch', fetchMock);
    renderCompliance();
    expect(
      await screen.findByRole('heading', { name: 'Compliance could not load.' }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(
      await screen.findByRole('heading', { name: 'Evidence missing' }),
    ).toBeInTheDocument();
  });
});
