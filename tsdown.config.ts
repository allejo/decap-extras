import { createRequire } from 'node:module';
import type { PackageJson } from 'type-fest';

const require = createRequire(import.meta.url);
const pkg = require('./package.json') as PackageJson;

export default {
	treeshake: true,
	splitting: true,
	entry: 'src/index.ts',
	target: 'esnext',
	format: ['esm'],
	dts: true,
	minify: false,
	clean: true,
	sourcemap: true,

	// When this environment variable is set, that means the `local-pack` script
	// is running, and we don't want build output to interfere with JSON output
	// from npm commands.
	silent: process.env.DEBUG_PACKING === '1',
	deps: {
		neverBundle: [
			// Don't bundle dependencies
			...Object.keys(pkg?.dependencies ?? {}),

			// Don't bundle built-in Node.js modules (use protocol imports!)
			/^node:.*/,
		],
	},
};
