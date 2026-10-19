import { units } from './config/units.js';
import { createInitialState } from './state/initial-state.js';
import { renderHome } from './ui/home.js';
import { mountPlatform } from './app.js';

// Ephemeral, empty state only; no scores, persistence, or state transitions.
export const initialState = createInitialState(units);
const root = document.getElementById('app');
// Minimal static verification hosts do not expose browser navigation APIs.
if (typeof window !== 'undefined' && root.addEventListener) mountPlatform(root);
else renderHome(root, units);
