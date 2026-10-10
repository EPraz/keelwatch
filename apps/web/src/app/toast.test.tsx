import { act, render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { Toast } from './toast';
import { ToastProvider } from './toast-provider';

afterEach(() => vi.useRealTimers());

it('stacks success and failure outside the page, retaining recovery actions', () => {
  const retry = vi.fn();
  const { container } = render(
    <ToastProvider>
      <main>
        <h1>Workspace</h1>
        <Toast role="status">Saved.</Toast>
        <Toast role="alert">
          Read failed.<button onClick={retry}>Retry</button>
        </Toast>
      </main>
    </ToastProvider>,
  );
  expect(container.querySelector('main .toast')).toBeNull();
  expect(container.querySelector('.toast-viewport')?.children).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(retry).toHaveBeenCalledOnce();
  fireEvent.click(screen.getAllByRole('button', { name: 'Dismiss notification' })[0]!);
  expect(screen.queryByRole('status')).toBeNull();
  expect(screen.getByRole('alert')).toHaveTextContent('Read failed.');
});

it('expires successes, pauses while hovered, keeps failures until dismissed and cleans timers', async () => {
  vi.useFakeTimers();
  const { unmount } = render(
    <ToastProvider>
      <Toast>Saved.</Toast>
      <Toast role="alert">Failed.</Toast>
    </ToastProvider>,
  );
  fireEvent.mouseEnter(screen.getByRole('status'));
  await act(() => vi.advanceTimersByTime(10000));
  expect(screen.getByRole('status')).toBeInTheDocument();
  fireEvent.mouseLeave(screen.getByRole('status'));
  await act(() => vi.advanceTimersByTime(8000));
  expect(screen.queryByRole('status')).toBeNull();
  expect(screen.getByRole('alert')).toBeInTheDocument();
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});
