import { describe, expect, it } from 'vitest';

import { add } from './index.js';

describe('math', () => {
	it('should add numbers correctly', () => {
		expect(add(2, 3)).toBe(5);
		expect(add(-1, 1)).toBe(0);
		expect(add(0, 0)).toBe(0);
	});
});
