import { setupServer } from 'msw/node';
import { figshareHandlers } from './handlers/figshareHandlers'; // same as used in browser

export const server = setupServer(...figshareHandlers);
