// Точка входа статического демо: «сервер в браузере» + панель демо (кроме главной страницы демо, у неё своя)
globalThis.__demoScriptUrl = import.meta.url;
import { demo } from './backend.js';
import { mountOverlay, goRole, ROLES, tgHtml } from './overlay.js';

globalThis.SutkiDemoUI = { mountOverlay, goRole, ROLES, tgHtml };
const start = () => { if (!document.documentElement.hasAttribute('data-demo-guest')) mountOverlay(); };   // сайт гостя — без панели демо
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
export { demo };
