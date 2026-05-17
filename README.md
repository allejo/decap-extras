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
| `WidgetTypeFromFactory<F>`                | Returns the TypeScript content type produced by a widget factory function `F`.       |
| `OptionalWidget<T>`                       | Brands a `CmsField` as optional (added by `optional()`).                             |
| `WidgetOpts<T>`                           | The options type for a given widget field type, with `widget` and `fields` stripped. |

## License

MIT
