import {afterEach, expect} from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
import {cleanup } from '@testing-library/react';

// @ts-expect-error don't care about anys in config stuff
expect.extend(matchers as any);

afterEach(cleanup)
