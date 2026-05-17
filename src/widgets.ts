import type {
	CmsField,
	CmsFieldBoolean,
	CmsFieldFileOrImage,
	CmsFieldList,
	CmsFieldMarkdown,
	CmsFieldNumber,
	CmsFieldObject,
	CmsFieldSelect,
	CmsFieldStringOrText,
} from 'decap-cms-core';

import type { OptionalWidget, WidgetOpts } from './api.js';

function customStringWidget<T extends string>(
	widget: string,
	label: string,
	name: T,
) {
	return {
		label,
		name,
		widget: widget as 'string',
	} as const satisfies CmsField;
}

// Widget Modifiers

export function optional<T extends CmsField>(widget: T): OptionalWidget<T> {
	return {
		...widget,
		required: false as const,
		__optional: true as const,
	};
}

// Primitive Widgets

export function boolWidget<T extends string>(
	label: string,
	name: T,
	options?: WidgetOpts<CmsFieldBoolean>,
) {
	return {
		label,
		name,
		widget: 'boolean',
		...(options ?? {}),
	} as const satisfies CmsField;
}

export function imageWidget<T extends string>(
	label: string,
	name: T,
	options?: WidgetOpts<CmsFieldFileOrImage>,
) {
	return {
		label,
		name,
		widget: 'image',
		...(options ?? {}),
		media_library: {
			name: 'cloudinary',
			config: {
				default_transformations: [
					[
						{
							fetch_format: 'auto',
							width: 300,
							quality: 'auto',
							crop: 'scale',
						},
					],
				],
			},
		},
	} as const satisfies CmsField;
}

export function listWidget<T extends string, F extends CmsField>(
	label: string,
	name: T,
	fields: F,
	options?: WidgetOpts<CmsFieldList>,
): { label: string; name: T; widget: 'list'; field: F };
export function listWidget<T extends string, F extends CmsField[]>(
	label: string,
	name: T,
	fields: F,
	options?: WidgetOpts<CmsFieldList>,
): { label: string; name: T; widget: 'list'; fields: F };
export function listWidget<T extends string, F extends CmsField | CmsField[]>(
	label: string,
	name: T,
	fields: F,
	options?: WidgetOpts<CmsFieldList>,
) {
	return {
		label,
		name,
		widget: 'list',
		...(options ?? {}),
		...(Array.isArray(fields) ? { fields } : { field: fields }),
	} as const;
}

export function markdownWidget<T extends string>(
	label: string,
	name: T,
	options?: WidgetOpts<CmsFieldMarkdown>,
) {
	return {
		label,
		name,
		widget: 'richtext' as 'string',
		...(options ?? {}),
	} as const satisfies CmsField;
}

export function objectWidget<T extends string, F extends CmsField[]>(
	label: string,
	name: T,
	fields: F,
	options?: WidgetOpts<CmsFieldObject>,
) {
	return {
		label,
		name,
		widget: 'object',
		...(options ?? {}),
		fields,
	} as const satisfies CmsField;
}

export function numberWidget<T extends string>(
	label: string,
	name: T,
	options?: WidgetOpts<CmsFieldNumber>,
) {
	return {
		label,
		name,
		widget: 'number',
		...(options ?? {}),
	} as const satisfies CmsField;
}

export function phoneWidget<T extends string>(label: string, name: T) {
	return customStringWidget('phone', label, name);
}

export function selectWidget<T extends string, O extends string[]>(
	label: string,
	name: T,
	choices: O,
	options?: WidgetOpts<CmsFieldSelect>,
) {
	return {
		label,
		name,
		widget: 'select',
		...(options ?? {}),
		options: choices ?? [],
	} as const satisfies CmsField;
}

export function stringWidget<T extends string>(
	label: string,
	name: T,
	options?: WidgetOpts<CmsFieldStringOrText>,
) {
	return {
		label,
		name,
		widget: 'string',
		...(options ?? {}),
	} as const satisfies CmsField;
}

export function textWidget<T extends string>(
	label: string,
	name: T,
	options?: WidgetOpts<CmsFieldStringOrText>,
) {
	return {
		label,
		name,
		widget: 'text',
		...(options ?? {}),
	} as const satisfies CmsField;
}

// Reusable Widget Configurations

/**
 * Stripped down Markdown widget configuration that does the following:
 *
 * - Allows bold, italic, lists (bullet + numbered), quotes
 * - No images or code block components
 * - Rich Text preview only
 */
export const BARE_MARKDOWN: WidgetOpts<CmsFieldMarkdown> = {
	buttons: [
		'bold',
		'bulleted-list',
		'italic',
		'link',
		'numbered-list',
		'quote',
	],
	editor_components: [],
	modes: ['rich_text'],
};

/**
 * Stripped down Markdown Widget configuration that allows only inline
 * elements (e.g., no lists, quotes, or headings) and rich text preview only.
 */
export const INLINE_MARKDOWN: WidgetOpts<CmsFieldMarkdown> = {
	buttons: ['bold', 'italic', 'link'],
	editor_components: [],
	modes: ['rich_text'],
};
