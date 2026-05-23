# @allejo/decap-extras

A TypeScript utility library for [Decap CMS](https://decapcms.org/) that does two things:

1. **Widget factory functions** — type-safe helpers for building Decap CMS field configuration objects instead of writing raw object literals by hand.
2. **Type inference utilities** — TypeScript utility types that derive content types directly from your CMS config, so you never have to maintain separate type definitions for your CMS content.

## Installation

```sh
npm install @allejo/decap-extras
# or
pnpm add @allejo/decap-extras
# or
yarn add @allejo/decap-extras
```

This package requires `decap-cms-core` as a peer dependency:

```sh
npm install decap-cms-core
```

## Usage

### Widget factories

All factory functions follow the same signature: `widget(label, name, options?)`.

```ts
import {
	BARE_MARKDOWN,
	boolWidget,
	imageWidget,
	INLINE_MARKDOWN,
	listWidget,
	markdownWidget,
	numberWidget,
	objectWidget,
	optional,
	selectWidget,
	stringWidget,
	textWidget,
} from '@allejo/decap-extras';
```

#### Scalar widgets

```ts
const titleField = stringWidget('Title', 'title');
const bodyField = textWidget('Body', 'body');
const countField = numberWidget('Count', 'count');
const activeField = boolWidget('Active', 'active');
```

#### Select widget

Pass the choices array `as const` to get a narrowed literal union type; omit `as const` to get `string`.

```ts
const themeField = selectWidget('Theme', 'theme', ['light', 'dark'] as const);
// TypeScript type: "light" | "dark"

const looseField = selectWidget('Size', 'size', ['sm', 'md', 'lg']);
// TypeScript type: string
```

#### Object widget

```ts
const metaField = objectWidget('Meta', 'meta', [
	stringWidget('Title', 'title'),
	stringWidget('Description', 'description'),
]);
```

#### List widget

Pass a single field to get `Array<T>`, or an array of fields to get `Array<{ ... }>`.

```ts
// Single-field list → Array<string>
const tagsField = listWidget('Tags', 'tags', stringWidget('Tag', 'tag'));

// Multi-field list → Array<{ label: string; value: string }>
const tagObjectsField = listWidget('Tag Objects', 'tagObjects', [
	stringWidget('Label', 'label'),
	stringWidget('Value', 'value'),
]);
```

#### Image widget

`imageWidget` is pre-configured with [Cloudinary](https://cloudinary.com/) as the media library, with default transformations (`fetch_format: auto`, `quality: auto`, `width: 300`, `crop: scale`). You can override these via the `options` parameter.

```ts
const heroField = imageWidget('Hero Image', 'hero');
```

#### Markdown widget

```ts
// Full markdown editor
const contentField = markdownWidget('Content', 'content');

// Restricted to bold, italic, lists, links, and quotes — no images or code blocks
const descriptionField = markdownWidget(
	'Description',
	'description',
	BARE_MARKDOWN,
);

// Inline elements only: bold, italic, and links
const captionField = markdownWidget('Caption', 'caption', INLINE_MARKDOWN);
```

#### Optional fields

Wrap any widget with `optional()` to mark it as not required in both the Decap CMS UI and the derived TypeScript type.

```ts
const subtitleField = optional(stringWidget('Subtitle', 'subtitle'));
// TypeScript type: string | undefined
```

#### Common options

Every factory accepts an optional last argument for [common widget options](https://decapcms.org/docs/widgets/#common-widget-options):

```ts
const slugField = stringWidget('Slug', 'slug', {
	required: true,
	hint: 'URL-friendly identifier, e.g. my-page-title',
	pattern: ['^[a-z0-9-]+$', 'Lowercase letters, numbers, and hyphens only'],
});
```

---

### Type inference

Define your CMS config using the widget factories and `as const`, then let `PropsByCollectionAndFile` derive a fully typed content object from it automatically.

```ts
// cms/config.ts
import {
	BARE_MARKDOWN,
	boolWidget,
	imageWidget,
	markdownWidget,
	objectWidget,
	optional,
	selectWidget,
	stringWidget,
} from '@allejo/decap-extras';

export const config = {
	collections: [
		{
			label: 'Pages',
			name: 'pages' as const,
			files: [
				{
					label: 'Home',
					name: 'home' as const,
					file: 'content/home.yml',
					fields: [
						stringWidget('Title', 'title'),
						optional(stringWidget('Subtitle', 'subtitle')),
						imageWidget('Hero Image', 'hero'),
						markdownWidget('Body', 'body', BARE_MARKDOWN),
						selectWidget('Theme', 'theme', ['light', 'dark'] as const),
						objectWidget('SEO', 'seo', [
							stringWidget('Meta Title', 'metaTitle'),
							optional(stringWidget('Meta Description', 'metaDescription')),
						]),
					],
				},
			],
		},
	],
} as const;
```

```ts
// components/HomePage.ts
import type { PropsByCollectionAndFile } from '@allejo/decap-extras';

import type { config } from '@/cms/config';

type HomePageProps = PropsByCollectionAndFile<typeof config, 'pages', 'home'>;
// Resolves to:
// {
//   title: string;
//   subtitle?: string;
//   hero: string;
//   body: string;
//   theme: "light" | "dark";
//   seo: {
//     metaTitle: string;
//     metaDescription?: string;
//   };
// }

function render(page: HomePageProps) {
	console.log(page.title); // string
	console.log(page.subtitle); // string | undefined
	console.log(page.theme); // "light" | "dark"
	console.log(page.seo.metaTitle); // string
}
```

#### Typing reusable widget functions

Use `WidgetTypeFromFactory` to derive a TypeScript type from a widget factory function without duplicating the definition.

```ts
import type { WidgetTypeFromFactory } from '@allejo/decap-extras';
import { objectWidget, optional, stringWidget } from '@allejo/decap-extras';

function seoWidget() {
	return objectWidget('SEO', 'seo', [
		stringWidget('Meta Title', 'metaTitle'),
		optional(stringWidget('Meta Description', 'metaDescription')),
	]);
}

type SeoWidget = WidgetTypeFromFactory<typeof seoWidget>;
// { metaTitle: string; metaDescription?: string }
```

#### Constraining to valid file names

Use `CollectionItemNames` to get a union of all file name literals for a collection. This is useful for constraining generic components or functions that accept a page name.

```ts
import type { CollectionItemNames } from '@allejo/decap-extras';

import type { config } from '@/cms/config';

type PageName = CollectionItemNames<typeof config, 'pages'>;
// "home" | "about" | ...

function getPageProps<F extends PageName>(
	page: F,
): PropsByCollectionAndFile<typeof config, 'pages', F> {
	// ...
}
```

## React Integration

Decap CMS is distributed either as [a single `.js` bundle you can load in an HTML file with `<script>` or as an ESM module you can import](https://decapcms.org/docs/install-decap-cms/). In order to integrate type-safety into working with Decap, we want to incorporate Decap CMS as a Next.js page so that we can get all the type-safety from working within it as a framework. There's one small problem with this though...

> You can also use Decap CMS as an npm module. Wherever you import Decap CMS, it automatically runs, taking over the current page.

This means, we can't just import Decap CMS in a Next.js page and call it a day. This is because at build time, Next.js will run the code in the page to generate the static HTML, and if Decap CMS is imported and initialized at that time, it's going to try to take over the page during the build process, which is not what we want. We only want Decap CMS to take over the page when it's running in the browser.

To work around this, we can use [dynamic imports (i.e., `import()`)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import) inside a `useEffect` hook to initialize Decap CMS only on the client after the Next.js boilerplate has rendered and allow the CMS instance to take over the page.

```tsx
useEffect(() => {
	Promise.all([
		import('decap-cms-app'),

		// You can import other Decap CMS modules
		// import('decap-cms-media-library-cloudinary')
	]).then(([cmsMod /*, cloudinaryMod*/]) => {
		const cms = cmsMod.default;
		const cloudinary = cloudinaryMod.default;

		cms.init({ config });

		// ...
		// cms.registerPreviewStyle(...)
		// cms.registerPreviewTemplate(...);
		// cms.registerWidget(...);
		// cms.registerMediaLibrary(cloudinary);
	});
}, []);
```

> The import() syntax, commonly called dynamic import, is a function-like expression that allows loading an ECMAScript module asynchronously and dynamically into a potentially non-module environment.

Is there a more elegant solution to this problem? I'm not sure! If you can think of one, I would gladly welcome the idea.

But knowing all of this and setting it up gets tedious and boilerplate-y really fast. So, in this package, we export a React component called `DecapInstance` that abstracts away all of this dynamic importing and initialization logic, so you can just use it as a wrapper around your admin page and pass in your config, preview styles, templates, widgets, and Cloudinary flag as props.

### The `<DecapInstance />` Component

We provide a React component called `DecapInstance` that handles the dynamic import and initialization of Decap CMS for you.

```tsx
import type { PropsByCollectionAndFile } from '@allejo/decap-extras';
import { getCssFilesFromManifest } from '@allejo/decap-extras/next';
import { DecapInstance } from '@allejo/decap-extras/react';
import type { ComponentType } from 'react';

import type { cmsConfig } from '@/cms/config';

// The HomePageProps type and HomePreview component are normally imported from
// other files, but are included here inline for demonstration purposes.
type HomePageProps = PropsByCollectionAndFile<
	typeof cmsConfig,
	'pages',
	'home'
>;
function HomePreview(props: HomePageProps) {
	return (
		<article>
			<h1>{props.title}</h1>
			{props.subtitle ? <p>{props.subtitle}</p> : null}
		</article>
	);
}

type AdminProps = {
	cssFiles: string[];
};

export async function getStaticProps() {
	const css = getCssFilesFromManifest(process.env.NODE_ENV ?? 'development', [
		'/',
		'/_app',
	]);

	return {
		props: {
			cssFiles: css.flattenedCssFiles,
		},
	};
}

export default function Admin({ cssFiles }: AdminProps) {
	return (
		<DecapInstance
			config={cmsConfig}
			cssFiles={cssFiles}
			// Pass explicitly so media-library behavior is visible in admin setup.
			useCloudinary={true}
			pages={{
				home: HomePreview as unknown as ComponentType<never>,
			}}
			widgets={{}}
			onInit={(cms) => {
				console.log('Decap initialized', cms);
			}}
		/>
	);
}
```

### How it Works

`getCssFilesFromManifest` reads Next.js's `.next/build-manifest.json` at build time and returns all CSS files associated with the `/` and `/_app` routes. These are passed as props to the admin page so that we can [register the CSS files into Decap's preview functionality](https://decapcms.org/docs/customization/#registerpreviewstyle).

```ts
export async function getStaticProps() {
	const cssFiles = getCssFilesFromManifest(process.env.NODE_ENV, [
		'/',
		'/_app',
	]);
	return { props: { cssFiles: cssFiles['flattenedCssFiles'] } };
}
```

> [!WARNING]
>
> This is a bit of a hacky solution to get the CSS files and therefore has some known issues.
>
> The CSS for a page might not exist during local development because Next.js only generates the build manifest as the pages are requested. Therefore, if launch `next dev` and immediately open the admin page, the CSS files won't be found for the homepage (i.e., `/`) and won't be registered in the CMS preview, resulting in an unstyled preview. To work around this, you can either visit the homepage first to trigger the generation of the CSS files in the manifest, or run `next build` to generate the manifest with all CSS files before running `next dev`. During local development, this function will check the dev manifest at `.next/dev/build-manifest.json` first, and fallback to the regular manifest at `.next/build-manifest.json` if the dev manifest doesn't exist, so it should work in either case as long as the CSS files have been recorded.
>
> If you have a better idea of handling this, please reach out!

#### Initialization sequence inside `useEffect`

```ts
cms.init({ config });
```

Bootstraps the CMS with the config from `src/cms/config.ts`.

```ts
cssFiles.forEach((css) => cms.registerPreviewStyle(css));
```

Registers every collected CSS file with the CMS preview panel so the editor renders with production styles.

> [!WARNING]
>
> **FIXME**: There HAS to be a better way of handling this so that we only load the relevant stylesheets for specific previews. I'm not sure how to solve this yet, but I'll come back to it.

```ts
cms.registerPreviewTemplate(pageId, ({ entry }) => {
  return <Component {...entry.get('data').toJSON()} />;
});
```

Maps each CMS page entry (`home`, etc.) to its real Next.js page component, passing the editor's live data as props. Editors see the actual production component rendering their changes in real time.

```ts
cms.registerMediaLibrary(cloudinary);
```

Registers the Cloudinary media picker.

> [!WARNING]
>
> Being able to _disable_ Cloudinary is a work-in-progress. I've always needed it for the projects I'm building so it's enabled by default. I'll get to respecting the "disable" environment variable... eventually.

## Server utilities

A server-side utility for getting CSS from Next.js build manifests. This is useful for registering CSS stylesheets into Decap's CMS preview system.

```ts
import { getCssFilesFromManifest } from '@allejo/decap-extras/next';
```

Use `getCssFilesFromManifest` in `getStaticProps` to collect the CSS paths needed by your page and pass them as props:

```ts
export async function getStaticProps() {
	const cssFiles = getCssFilesFromManifest(process.env.NODE_ENV, [
		'/',
		'/_app',
	]);

	return {
		props: {
			cssFiles: cssFiles['flattenedCssFiles'],
		},
	};
}
```

Then register each path as a preview stylesheet in your Decap CMS admin component:

```ts
export default function Admin({ cssFiles }: Props) {
	// ...

	cssFiles.forEach((css) => {
		cms.registerPreviewStyle(css);
	});
}
```

> **Note:** This utility reads `.next/build-manifest.json` (or `.next/dev/build-manifest.json` in development) and is intended for Next.js projects only.

---

## API reference

### Widget functions

| Function                                     | Decap widget                                                   | TypeScript type           |
| -------------------------------------------- | -------------------------------------------------------------- | ------------------------- |
| `stringWidget(label, name, opts?)`           | [`string`](https://decapcms.org/docs/widgets/#string)          | `string`                  |
| `textWidget(label, name, opts?)`             | [`text`](https://decapcms.org/docs/widgets/#text)              | `string`                  |
| `markdownWidget(label, name, opts?)`         | [`richtext`](https://decapcms.org/docs/widgets/#richtext-beta) | `string`                  |
| `imageWidget(label, name, opts?)`            | [`image`](https://decapcms.org/docs/widgets/#image)            | `string`                  |
| `numberWidget(label, name, opts?)`           | [`number`](https://decapcms.org/docs/widgets/#number)          | `number`                  |
| `boolWidget(label, name, opts?)`             | [`boolean`](https://decapcms.org/docs/widgets/#boolean)        | `boolean`                 |
| `selectWidget(label, name, choices, opts?)`  | [`select`](https://decapcms.org/docs/widgets/#select)          | literal union or `string` |
| `listWidget(label, name, field, opts?)`      | [`list`](https://decapcms.org/docs/widgets/#list)              | `Array<T>`                |
| `listWidget(label, name, fields[], opts?)`   | [`list`](https://decapcms.org/docs/widgets/#list)              | `Array<{ ... }>`          |
| `objectWidget(label, name, fields[], opts?)` | [`object`](https://decapcms.org/docs/widgets/#object)          | `{ ... }`                 |
| `optional(widget)`                           | —                                                              | marks field optional      |

### Markdown presets

| Constant          | Description                                                   |
| ----------------- | ------------------------------------------------------------- |
| `BARE_MARKDOWN`   | Bold, italic, lists, links, quotes. No images or code blocks. |
| `INLINE_MARKDOWN` | Bold, italic, and links only. No block-level elements.        |

### Type utilities

| Type                                      | Description                                                                          |
| ----------------------------------------- | ------------------------------------------------------------------------------------ |
| `PropsByCollectionAndFile<TConfig, C, F>` | Derives a typed content object from a CMS config for collection `C` and file `F`.    |
| `CollectionItemNames<TConfig, C>`         | Union of all file name literals defined in collection `C`.                           |
| `WidgetTypeFromFactory<F>`                | Returns the TypeScript content type produced by a widget factory function `F`.       |
| `OptionalWidget<T>`                       | Brands a `CmsField` as optional (added by `optional()`).                             |
| `WidgetOpts<T>`                           | The options type for a given widget field type, with `widget` and `fields` stripped. |

### Server utilities

| Function                              | Description                                                                                                                                                              |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `getCssFilesFromManifest(env, pages)` | Reads the Next.js build manifest and returns CSS paths for the given page routes, grouped by page (`allCssFiles`) and as a deduplicated flat list (`flattenedCssFiles`). |

### React utilities

| Type/Function        | Description                                                                                                                                              |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DecapInstance`      | React component that initializes Decap CMS, registers preview CSS/templates/widgets, optionally enables Cloudinary, and returns `null` after setup.      |
| `DecapInstanceProps` | Props contract for `DecapInstance`, including config, preview CSS paths, page template registry, widget registry, and optional `onInit`/`useCloudinary`. |

## License

MIT
