import '@fontsource-variable/newsreader';
import '@fontsource-variable/public-sans';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/app';
import { AuthRoot } from './auth/auth-root';
import './styles/tokens.css';
import './styles/base.css';
import './styles/auth.css';
import './styles/shell.css';
import './styles/fleet.css';
import './styles/compliance.css';
import './styles/crew.css';
import './styles/maintenance.css';

const root = document.getElementById('root');
if (!root) throw new Error('Application root element is missing.');

createRoot(root).render(
  <StrictMode>
    <AuthRoot>
      <App />
    </AuthRoot>
  </StrictMode>,
);
