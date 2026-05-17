import type { CmsField } from 'decap-cms-core';

/**
 * Get a widget's options while excluding keys we're handling (i.e., `widget`,
 * `fields`) and respect [global common options](https://decapcms.org/docs/widgets/#String#common-widget-options).
 */
export type WidgetOpts<T extends { widget?: string; fields?: unknown[] }> =
	Omit<T, 'widget' | 'fields'> & {
		required?: boolean;
		hint?: string;
		pattern?: [string, string];
	};

export type OptionalWidget<T extends CmsField> = T & {
	required: false;
	__optional: true;
};

/**
 * Recursively expands a type alias into its fully resolved shape.
 * TypeScript does not eagerly expand type aliases in IDE hover tooltips —
 * intermediate type aliases like `FieldsToObject<...>` are shown as-is rather
 * than their resolved structure. Wrapping a type with this helper forces the
 * IDE to display the fully resolved object shape at every level of nesting.
 * This has no effect on type safety or runtime behavior; it is purely cosmetic.
 *
 * @example
 * // Without this helper, the IDE may show:
 * // type SectionWidget = FieldsToObject<[...]>
 * //
 * // With this helper, the IDE shows:
 * // type SectionWidget = {
 * //   images: Array<{ polaroid: { image: string; altText?: string; caption: string } }>;
 * //   text: string;
 * //   imagePosition: "left" | "right";
 * // }
 */
type IDE_HACK_ExpandRecursiveType<T> = T extends infer O
	? {
			[K in keyof O]: O[K] extends object
				? IDE_HACK_ExpandRecursiveType<O[K]>
				: O[K];
		}
	: never;

/**
 * Recursively finds the first item in a readonly tuple/array whose `Key`
 * property matches `Value`.
 *
 * Resolves to `never` when no matching item exists.
 *
 * @example
 * type Found = Lookup<
 *   [{ name: "home"; file: "home.yml" }, { name: "about"; file: "about.yml" }],
 *   "name",
 *   "about"
 * >;
 * // { name: "about"; file: "about.yml" }
 *
 * @example
 * type Missing = Lookup<[{ name: "home"; file: "home.yml" }], "name", "contact">;
 * // never
 */
type Lookup<
	Array extends readonly unknown[],
	Key extends string,
	Value extends string,
> = Array extends readonly [infer First, ...infer Rest]
	? First extends Record<Key, Value>
		? First
		: Lookup<Rest, Key, Value>
	: never;

/**
 * Get all the collection definitions as a data type from a given config.
 */
type CollectionTypes<TConfig extends { collections: readonly unknown[] }> =
	TConfig['collections'][number];

/**
 * Get all the collection names from `CollectionTypes` as a union of string
 * literal types to later use with `Lookup<...>`.
 */
type CollectionNames<TConfig extends { collections: readonly unknown[] }> =
	CollectionTypes<TConfig> extends { name: infer N } ? N & string : never;

/**
 * Get the specific collection structure for a given collection name. For
 * example, `CollectionByName<Config, "pages">` would resolve to the collection
 * definition object for the "Pages" collection in the config,
 * which would look something like,
 *
 * ```
 * {
 *   label: "Pages",
 *   name: "pages",
 *   files: ({
 *     label: "Home",
 *     name: "home",
 *     ...
 *   })[]
 * }
 * ```
 */
type CollectionByName<
	TConfig extends { collections: readonly unknown[] },
	N extends CollectionNames<TConfig>,
> = Lookup<TConfig['collections'], 'name', N>; // prettier-ignore

/**
 * Get the specific fields defined for a given page. For example,
 * `FileByName<"site/pages/home.yml">` will return the fields defined for the
 * "home.yml" file in the config, which would look something like,
 *
 * ```
 * {
 *   label: "Welcome Section",
 *   name: "welcomeSection",
 *   widget: "object",
 *   fields: (...)[]
 * }
 * ```
 */
type FileByName<
	C extends { files: readonly unknown[] },
	F extends C['files'][number] extends { name: infer N } ? N & string : never,
> = Lookup<C['files'], 'name', F>;

/**
 * The bare minimum that every file definition in the config must have to be
 * able to look up its fields and translate them to TypeScript types.
 */
type CmsCollectionFile = {
	name: string;
	file: string;
	fields: readonly CmsField[];
};

/**
 * Converts an array of `CmsField` definitions into a TypeScript object type,
 * mapping each field's `name` to its corresponding TypeScript type via
 * {@link TypeScriptTypeForField}.
 *
 * Fields marked as optional (via {@link OptionalWidget}) are emitted as
 * optional keys (`key?`); all other fields are required.
 *
 * @example
 * type Result = FieldsToObject<[
 *   { name: "title"; widget: "string" },
 *   { name: "ending"; widget: "string"; required: false; __optional: true },
 * ]>;
 * // { ending?: string } & { title: string }
 */
type FieldsToObject<Fields extends readonly CmsField[]> = {
	[F in Fields[number] as F extends OptionalWidget<F>
		? F['name']
		: never]?: TypeScriptTypeForField<F>;
} & {
	[F in Fields[number] as F extends OptionalWidget<F>
		? never
		: F['name']]: TypeScriptTypeForField<F>;
};

/**
 * Translates the top-level `fields` of a CMS collection file definition into a
 * TypeScript object type using {@link FieldsToObject}.
 *
 * This is the entry point for type generation from a file definition — it
 * extracts `F["fields"]` and delegates to `FieldsToObject` so that the same
 * optional/required splitting logic applies uniformly.
 */
type FieldsOfFile<F extends CmsCollectionFile> = FieldsToObject<F['fields']>;

/**
 * Translate from `widget` types to their corresponding TypeScript types. For
 * example, a field with `widget: "string"` will be translated to a TypeScript
 * type of `string`, and a field with `widget: "object"` and nested `fields`
 * will be recursively translated to a nested object type.
 *
 * For `widget: "select"`, if the field's `options` is a readonly tuple of
 * string literals, the type is narrowed to the union of those literals instead
 * of a plain `string`.
 *
 * Note: This is not an exhaustive mapping of all possible widget types, but it
 * can be extended as needed.
 */
type TypeScriptTypeForField<F extends CmsField> = F['widget'] extends
	| 'string'
	| 'richtext'
	| 'text'
	| 'image'
	? string
	: F['widget'] extends 'number'
		? number
		: F['widget'] extends 'boolean'
			? boolean
			: F['widget'] extends 'select'
				? F extends { options: readonly (infer O)[] }
					? O
					: string
				: F['widget'] extends 'list'
					? F extends { fields: readonly CmsField[] }
						? Array<FieldsToObject<F['fields']>>
						: F extends { field: CmsField }
							? Array<TypeScriptTypeForField<F['field']>>
							: unknown[]
					: F['widget'] extends 'object'
						? F extends { fields: readonly CmsField[] }
							? FieldsToObject<F['fields']>
							: Record<string, unknown>
						: unknown;

/**
 * Get all the file names for a given collection name as a union of string
 * literal types to later use with `Lookup<...>`. For example,
 * `CollectionItemNames<Config, "pages">` would resolve to the union of all
 * file names defined in the "Pages" collection, such as `"home" | "about" | ...`.
 */
type CollectionItemNames<
	TConfig extends { collections: readonly unknown[] },
	C extends CollectionNames<TConfig>,
> =
	CollectionByName<TConfig, C> extends { files: readonly unknown[] }
		? CollectionByName<TConfig, C>['files'][number] extends { name: infer N }
			? N & string
			: never
		: never;

/**
 * Based on a collection's name and the respective file name, return a TypeScript
 * object presenting the translated DecapCMS widget types into native TypeScript
 * types.
 *
 * @example
 * import { config } from '@/cms/config';
 * type MyProps = PropsByCollectionAndFile<typeof config, 'blog', 'post'>;
 */
export type PropsByCollectionAndFile<
	TConfig extends { collections: readonly unknown[] },
	C extends CollectionNames<TConfig>,
	F extends CollectionItemNames<TConfig, C>,
> = IDE_HACK_ExpandRecursiveType<
	CollectionByName<TConfig, C> extends {
		files: infer Files extends readonly unknown[];
	}
		? FieldsOfFile<FileByName<{ files: Files }, F & string>>
		: never
>;

type WidgetFactory = (...args: any[]) => CmsField;

/**
 * Given a widget factory function, return the TypeScript type that corresponds
 * to the `widget` type(s) that the factory produces. For example, if a widget
 * factory produces a field with `widget: "object"` and nested `fields`, it will
 * be translated to a nested object type.
 *
 * Note: This relies on the widget factories being defined in a way that their
 * return type is fully inferable by TypeScript.
 */
export type WidgetTypeFromFactory<F extends WidgetFactory> =
	IDE_HACK_ExpandRecursiveType<TypeScriptTypeForField<ReturnType<F>>>;
