import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@managerhub/ui/styles.css';
import './i18n';
import App from './App';

const root = document.getElementById('root');
if (!root) throw new Error('ManagerHub root element missing');
createRoot(root).render(<StrictMode><App/></StrictMode>);
