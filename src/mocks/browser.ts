// src/mocks/browser.ts
import { setupWorker } from 'msw/browser'
import { figshareHandlers } from './handlers/figshareHandlers'

export const worker = setupWorker(...figshareHandlers)
