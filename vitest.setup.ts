import {afterAll, afterEach, beforeAll, expect} from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
import {cleanup } from '@testing-library/react';
import {server} from "@/mocks/server";

expect.extend(matchers as never);

afterEach(cleanup)

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
