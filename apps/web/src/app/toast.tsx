import {
  Children,
  isValidElement,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { ToastContext } from './toast-context';

function textContent(children: ReactNode): string {
  return Children.toArray(children)
    .map((child): string => {
      if (typeof child === 'string' || typeof child === 'number') return String(child);
      return isValidElement<{ children?: ReactNode }>(child)
        ? textContent(child.props.children)
        : '';
    })
    .join(' ');
}

export function Toast({
  children,
  role = 'status',
  onDismiss,
  ...props
}: ComponentPropsWithRef<'div'> & { readonly onDismiss?: () => void }) {
  const viewport = useContext(ToastContext);
  const message = textContent(children);
  const previousFocus = useRef(document.activeElement);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (role === 'alert' || paused || dismissed === message) return;
    const timer = window.setTimeout(() => setDismissed(message), 8000);
    return () => window.clearTimeout(timer);
  }, [role, paused, dismissed, message]);
  if (dismissed === message || viewport === null) return null;
  const toast = (
    <div
      {...props}
      className={`toast toast--${role === 'alert' ? 'error' : 'success'}`}
      role={role}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
    >
      <span className="toast__icon" aria-hidden="true">
        {role === 'alert' ? '!' : '✓'}
      </span>
      <div className="toast__content">{children}</div>
      <button
        type="button"
        className="toast__close"
        aria-label="Dismiss notification"
        onClick={() => {
          setDismissed(message);
          if (
            previousFocus.current instanceof HTMLElement &&
            previousFocus.current.isConnected
          ) {
            previousFocus.current.focus({ preventScroll: true });
          }
          onDismiss?.();
        }}
      >
        ×
      </button>
    </div>
  );
  return createPortal(
    viewport ? toast : <div className="toast-viewport">{toast}</div>,
    viewport ?? document.body,
  );
}
