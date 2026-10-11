import { useState, type ComponentPropsWithoutRef } from 'react';
import { Toast } from './toast';

export function ReadFailure({ children, ...props }: ComponentPropsWithoutRef<'div'>) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) {
    return (
      <div {...props} className="form-error">
        {children}
      </div>
    );
  }
  return (
    <Toast {...props} role="alert" onDismiss={() => setDismissed(true)}>
      {children}
    </Toast>
  );
}
