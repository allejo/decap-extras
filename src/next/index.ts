import fs from 'node:fs';
import path from 'node:path';

/**
 * Reads the Next.js build manifest and extracts CSS file paths for the given
 * pages, resolving the manifest location based on the current environment.
 *
 * In development, reads from `.next/dev/build-manifest.json`; in all other
 * environments, reads from `.next/build-manifest.json`.
 *
 * CSS paths are rewritten from the `static/` prefix used internally by Next.js
 * to the `/_next/static/` public URL path.
 *
 * @param env - The current environment (e.g. `"development"` or `"production"`).
 * @param pages - List of Next.js page routes to extract CSS files for
 *   (e.g. `["/", "/_app"]`).
 *
 * @returns An object with two properties:
 *   - `allCssFiles` — a map of page route to its CSS file paths.
 *   - `flattenedCssFiles` — a deduplicated flat list of all CSS file paths
 *     across every requested page.
 */
export function getCssFilesFromManifest(env: string, pages: string[]) {
	const devManifestPath = path.join(
		process.cwd(),
		'.next',
		'dev',
		'build-manifest.json',
	);
	const manifestPath = path.join(process.cwd(), '.next', 'build-manifest.json');

	const devBuildManifest = fs.existsSync(devManifestPath)
		? JSON.parse(fs.readFileSync(devManifestPath, 'utf8'))
		: null;
	const buildManifest = fs.existsSync(manifestPath)
		? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
		: null;

	const allCssFiles: Record<string, string[]> = {};
	const flattenedCssFilesSet = new Set<string>();

	pages.forEach((page) => {
		const assets: string[] | undefined =
			env === 'production'
				? buildManifest?.pages[page]
				: (devBuildManifest?.pages[page] ?? buildManifest?.pages[page]);

		if (!assets) {
			throw new Error(
				`No manifest found for ${page}. Ensure "next build" has been run at least once.`,
			);
		}

		assets
			.filter((file: string) => file.endsWith('.css'))
			.forEach((file: string) => {
				if (!allCssFiles[page]) {
					allCssFiles[page] = [];
				}

				const fullPath = file.replace('static/', '/_next/static/');

				allCssFiles[page].push(fullPath);
				flattenedCssFilesSet.add(fullPath);
			});
	});

	return {
		flattenedCssFiles: [...flattenedCssFilesSet],
		allCssFiles,
	};
}
