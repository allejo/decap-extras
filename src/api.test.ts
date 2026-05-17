import type { CmsField } from 'decap-cms-core';
import { describe, expectTypeOf, it } from 'vitest';

import type {
	OptionalWidget,
	PropsByCollectionAndFile,
	WidgetOpts,
	WidgetTypeFromFactory,
} from './api.js';
import {
	boolWidget,
	imageWidget,
	listWidget,
	numberWidget,
	objectWidget,
	optional,
	selectWidget,
	stringWidget,
	textWidget,
} from './widgets.js';

const mockConfig = {
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
						textWidget('Body', 'body'),
						imageWidget('Hero', 'hero'),
						numberWidget('Count', 'count'),
						boolWidget('Published', 'published'),
						selectWidget('Theme', 'theme', ['light', 'dark'] as const),
						selectWidget('Theme Loose', 'themeLoose', ['a', 'b']),
						listWidget('Tags', 'tags', [] as unknown as CmsField),
						listWidget('Tag Objects', 'tagObjects', [
							stringWidget('Label', 'label'),
							stringWidget('Value', 'value'),
						]),
						listWidget(
							'Single List',
							'singleList',
							numberWidget('Item', 'item'),
						),
						objectWidget('Meta', 'meta', [
							stringWidget('Description', 'description'),
							stringWidget('Keywords', 'keywords'),
						]),
						{
							name: 'unknownWidget' as const,
							widget: 'code' as const,
						} satisfies CmsField,
					] as const,
				},
				{
					label: 'About',
					name: 'about' as const,
					file: 'content/about.yml',
					fields: [
						stringWidget('Heading', 'heading'),
						optional(stringWidget('Subtitle', 'subtitle')),
					] as const,
				},
			] as const,
		},
		{
			label: 'Settings',
			name: 'settings' as const,
			files: [
				{
					label: 'General',
					name: 'general' as const,
					file: 'content/settings.yml',
					fields: [stringWidget('Site Name', 'siteName')] as const,
				},
			] as const,
		},
	],
} as const;

describe('WidgetOpts', () => {
	it('strips the widget key from the source type', () => {
		type Input = { widget: 'string'; label: string; default?: string };
		type Result = WidgetOpts<Input>;

		expectTypeOf<Result>().not.toHaveProperty('widget');
	});

	it('strips the fields key from the source type', () => {
		type Input = {
			widget: 'object';
			fields: { name: string }[];
			label: string;
		};
		type Result = WidgetOpts<Input>;

		expectTypeOf<Result>().not.toHaveProperty('fields');
	});

	it('preserves keys not in the strip list', () => {
		type Input = { widget: 'string'; label: string; default?: string };
		type Result = WidgetOpts<Input>;

		expectTypeOf<Result>().toHaveProperty('label');
	});

	it('injects optional required field', () => {
		type Input = { widget: 'string' };
		type Result = WidgetOpts<Input>;

		expectTypeOf<Result>()
			.toHaveProperty('required')
			.toEqualTypeOf<boolean | undefined>();
	});

	it('injects optional hint field', () => {
		type Input = { widget: 'string' };
		type Result = WidgetOpts<Input>;

		expectTypeOf<Result>()
			.toHaveProperty('hint')
			.toEqualTypeOf<string | undefined>();
	});

	it('injects optional pattern field as a two-element string tuple', () => {
		type Input = { widget: 'string' };
		type Result = WidgetOpts<Input>;

		expectTypeOf<Result>()
			.toHaveProperty('pattern')
			.toEqualTypeOf<[string, string] | undefined>();
	});

	it('accepts a type with only optional widget/fields', () => {
		// widget and fields are optional on the constraint; WidgetOpts should still compile
		type Input = { widget?: 'string'; fields?: never[]; label: string };
		type Result = WidgetOpts<Input>;

		expectTypeOf<Result>().not.toHaveProperty('widget');
		expectTypeOf<Result>().toHaveProperty('label');
	});
});

describe('OptionalWidget', () => {
	it('brands the type with __optional: true', () => {
		type Input = { name: 'title'; widget: 'string' };
		type Result = OptionalWidget<Input>;

		expectTypeOf<Result>().toHaveProperty('__optional').toEqualTypeOf<true>();
	});

	it('sets required to false', () => {
		type Input = { name: 'title'; widget: 'string' };
		type Result = OptionalWidget<Input>;

		expectTypeOf<Result>().toHaveProperty('required').toEqualTypeOf<false>();
	});

	it('preserves all base CmsField properties', () => {
		type Input = { name: 'title'; widget: 'string'; label: string };
		type Result = OptionalWidget<Input>;

		expectTypeOf<Result>().toHaveProperty('name').toEqualTypeOf<'title'>();
		expectTypeOf<Result>().toHaveProperty('widget').toEqualTypeOf<'string'>();
		expectTypeOf<Result>().toHaveProperty('label').toEqualTypeOf<string>();
	});
});

describe('PropsByCollectionAndFile', () => {
	describe('scalar widget mappings', () => {
		it('maps string widget to string', () => {
			type Result = PropsByCollectionAndFile<
				typeof mockConfig,
				'pages',
				'home'
			>;

			expectTypeOf<Result>().toHaveProperty('title').toEqualTypeOf<string>();
		});

		it('maps text widget to string', () => {
			type Result = PropsByCollectionAndFile<
				typeof mockConfig,
				'pages',
				'home'
			>;

			expectTypeOf<Result>().toHaveProperty('body').toEqualTypeOf<string>();
		});

		it('maps image widget to string', () => {
			type Result = PropsByCollectionAndFile<
				typeof mockConfig,
				'pages',
				'home'
			>;

			expectTypeOf<Result>().toHaveProperty('hero').toEqualTypeOf<string>();
		});

		it('maps number widget to number', () => {
			type Result = PropsByCollectionAndFile<
				typeof mockConfig,
				'pages',
				'home'
			>;

			expectTypeOf<Result>().toHaveProperty('count').toEqualTypeOf<number>();
		});

		it('maps boolean widget to boolean', () => {
			type Result = PropsByCollectionAndFile<
				typeof mockConfig,
				'pages',
				'home'
			>;

			expectTypeOf<Result>()
				.toHaveProperty('published')
				.toEqualTypeOf<boolean>();
		});

		it('maps unknown widget to unknown', () => {
			type Result = PropsByCollectionAndFile<
				typeof mockConfig,
				'pages',
				'home'
			>;

			expectTypeOf<Result>()
				.toHaveProperty('unknownWidget')
				.toEqualTypeOf<unknown>();
		});
	});

	describe('select widget', () => {
		it('narrows to a literal union when options is a readonly tuple', () => {
			type Result = PropsByCollectionAndFile<
				typeof mockConfig,
				'pages',
				'home'
			>;

			expectTypeOf<Result>()
				.toHaveProperty('theme')
				.toEqualTypeOf<'light' | 'dark'>();
		});

		it('falls back to string when options is a mutable array', () => {
			type Result = PropsByCollectionAndFile<
				typeof mockConfig,
				'pages',
				'home'
			>;

			expectTypeOf<Result>()
				.toHaveProperty('themeLoose')
				.toEqualTypeOf<string>();
		});
	});

	describe('list widget', () => {
		it('maps plain list (no fields/field) to unknown[]', () => {
			type Result = PropsByCollectionAndFile<
				typeof mockConfig,
				'pages',
				'home'
			>;

			expectTypeOf<Result>().toHaveProperty('tags').toEqualTypeOf<unknown[]>();
		});

		it('maps list with fields to an array of objects', () => {
			type Result = PropsByCollectionAndFile<
				typeof mockConfig,
				'pages',
				'home'
			>;

			expectTypeOf<Result>()
				.toHaveProperty('tagObjects')
				.toEqualTypeOf<Array<{ label: string; value: string }>>();
		});

		it('maps list with a single field to an array of the field type', () => {
			type Result = PropsByCollectionAndFile<
				typeof mockConfig,
				'pages',
				'home'
			>;

			expectTypeOf<Result>()
				.toHaveProperty('singleList')
				.toEqualTypeOf<Array<number>>();
		});
	});

	describe('object widget', () => {
		it('maps object with fields to a nested object type', () => {
			type Result = PropsByCollectionAndFile<
				typeof mockConfig,
				'pages',
				'home'
			>;

			expectTypeOf<Result>()
				.toHaveProperty('meta')
				.toEqualTypeOf<{ description: string; keywords: string }>();
		});
	});

	describe('optional fields', () => {
		it('emits optional fields as optional keys', () => {
			type Result = PropsByCollectionAndFile<
				typeof mockConfig,
				'pages',
				'about'
			>;

			// subtitle is marked optional — the property type should include undefined
			expectTypeOf<Result>()
				.toHaveProperty('subtitle')
				.toEqualTypeOf<string | undefined>();
		});

		it('keeps required fields as required keys', () => {
			type Result = PropsByCollectionAndFile<
				typeof mockConfig,
				'pages',
				'about'
			>;

			expectTypeOf<Result>().toHaveProperty('heading').toEqualTypeOf<string>();
		});
	});

	describe('collection and file resolution', () => {
		it('resolves fields from a different collection', () => {
			type Result = PropsByCollectionAndFile<
				typeof mockConfig,
				'settings',
				'general'
			>;

			expectTypeOf<Result>().toHaveProperty('siteName').toEqualTypeOf<string>();
		});

		it('resolves fields from a second file in the same collection', () => {
			type Result = PropsByCollectionAndFile<
				typeof mockConfig,
				'pages',
				'about'
			>;

			expectTypeOf<Result>().toHaveProperty('heading').toEqualTypeOf<string>();
		});
	});
});

describe('WidgetTypeFromFactory', () => {
	it('resolves string factory return type to string', () => {
		const stringFactory = (label: string) =>
			({ name: label, widget: 'string' as const }) as const;
		type Result = WidgetTypeFromFactory<typeof stringFactory>;

		expectTypeOf<Result>().toEqualTypeOf<string>();
	});

	it('resolves number factory return type to number', () => {
		const numberFactory = (label: string) =>
			({ name: label, widget: 'number' as const }) as const;
		type Result = WidgetTypeFromFactory<typeof numberFactory>;

		expectTypeOf<Result>().toEqualTypeOf<number>();
	});

	it('resolves boolean factory return type to boolean', () => {
		const boolFactory = (label: string) =>
			({ name: label, widget: 'boolean' as const }) as const;
		type Result = WidgetTypeFromFactory<typeof boolFactory>;

		expectTypeOf<Result>().toEqualTypeOf<boolean>();
	});

	it('resolves select factory to a literal union when options is readonly', () => {
		const selectFactory = () =>
			({
				name: 'color',
				widget: 'select' as const,
				options: ['red', 'green', 'blue'] as const,
			}) as const satisfies CmsField;
		type Result = WidgetTypeFromFactory<typeof selectFactory>;

		expectTypeOf<Result>().toEqualTypeOf<'red' | 'green' | 'blue'>();
	});

	it('resolves object factory to a nested object type', () => {
		const objectFactory = () =>
			({
				name: 'address',
				widget: 'object',
				fields: [
					{ name: 'street', widget: 'string' },
					{ name: 'city', widget: 'string' },
				],
			}) as const satisfies CmsField;
		type Result = WidgetTypeFromFactory<typeof objectFactory>;

		expectTypeOf<Result>().toEqualTypeOf<{ street: string; city: string }>();
	});

	it('resolves list-with-fields factory to an array of objects', () => {
		const listFactory = () =>
			({
				name: 'items',
				widget: 'list',
				fields: [
					{ name: 'id', widget: 'number' },
					{ name: 'label', widget: 'string' },
				],
			}) as const satisfies CmsField;
		type Result = WidgetTypeFromFactory<typeof listFactory>;

		expectTypeOf<Result>().toEqualTypeOf<
			Array<{ id: number; label: string }>
		>();
	});
});
