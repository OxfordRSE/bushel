import {afterAll, afterEach, beforeAll} from 'vitest';
import '@testing-library/jest-dom/vitest';
import {cleanup } from '@testing-library/react';
import {server} from "@/mocks/server";

afterEach(cleanup)

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
