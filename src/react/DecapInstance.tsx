import type {
	CMS,
	CmsConfig,
	CmsWidgetControlProps,
	CmsWidgetPreviewProps,
} from 'decap-cms-core';
import { ComponentClass, ComponentType, useEffect } from 'react';

/**
 * Props for {@link DecapInstance}.
 *
 * This object describes everything needed to initialize the Decap CMS runtime
 * in a React/Next.js admin page.
 */
export interface DecapInstanceProps {
	/**
	 * Decap CMS configuration object passed to `cms.init({ config })`.
	 *
	 * @example
	 * const config = {
	 * 	backend: { name: 'git-gateway' },
	 * 	collections: [...],
	 * } as const;
	 */
	config: CmsConfig;
	/**
	 * Stylesheets that should be available inside preview panes.
	 *
	 * This is commonly generated in Next.js via
	 * `getCssFilesFromManifest(process.env.NODE_ENV, ['/', '/_app'])` and passed
	 * through page props.
	 */
	cssFiles: string[];
	/**
	 * Map of preview template IDs to React components.
	 *
	 * Each component receives the serialized entry data as props
	 * (`entry.get('data').toJSON()`). In practice, this lets you pair inferred
	 * content types from `PropsByCollectionAndFile` with your preview templates.
	 */
	pages: Record<string, ComponentType<never>>;
	/**
	 * Optional callback invoked after Decap has been initialized and all
	 * templates/widgets have been registered.
	 *
	 * Use this hook for custom registration that depends on the CMS instance.
	 *
	 * @example
	 * onInit: (cms) => {
	 * 	cms.registerEditorComponent({
	 * 		id: 'callout',
	 * 		label: 'Callout',
	 * 	});
	 * }
	 */
	onInit?: (cms: CMS) => void;
	/**
	 * Enables Cloudinary media library registration when set to `true`.
	 *
	 * Defaults to `false`. Pass this explicitly so the admin setup remains
	 * obvious to future maintainers.
	 */
	useCloudinary?: boolean;
	/**
	 * Registry of custom widgets to register with Decap.
	 *
	 * @example
	 * widgets: {
	 * 	color: {
	 * 		control: ColorControl,
	 * 		preview: ColorPreview,
	 * 	},
	 * }
	 */
	widgets: Record<
		string,
		{
			/**
			 * Widget editor component used in the Decap entry form.
			 */
			control: ComponentClass<CmsWidgetControlProps<unknown>>;
			/**
			 * Widget preview component used in Decap preview rendering.
			 */
			preview: ComponentType<CmsWidgetPreviewProps<unknown>>;
		}
	>;
}

/**
 * Initializes Decap CMS from a React component, then returns `null`.
 *
 * This component performs all setup in a `useEffect` call: it boots Decap,
 * registers preview CSS, wires preview templates, registers custom widgets,
 * optionally enables Cloudinary, and finally calls `onInit`.
 *
 * @example
 * import type { PropsByCollectionAndFile } from '@allejo/decap-extras';
 * import { DecapInstance } from '@allejo/decap-extras/react';
 *
 * import type { cmsConfig } from '@/cms/config';
 *
 * type HomePageProps = PropsByCollectionAndFile<typeof cmsConfig, 'pages', 'home'>;
 */
export const DecapInstance = ({
	config,
	cssFiles,
	onInit,
	pages,
	useCloudinary = false,
	widgets,
}: DecapInstanceProps) => {
	useEffect(() => {
		Promise.all([
			import('decap-cms-app'),
			useCloudinary
				? // @ts-expect-error package has no types
					import('decap-cms-media-library-cloudinary')
				: Promise.resolve(null),
		]).then(([cmsMod, cloudinaryMod]) => {
			const cms = cmsMod.default;
			const cloudinary = cloudinaryMod.default;

			cms.init({ config });

			cssFiles.forEach((css) => {
				cms.registerPreviewStyle(css);
			});

			Object.entries(pages).forEach(([pageId, PageComponent]) => {
				cms.registerPreviewTemplate(pageId, ({ entry }) => {
					const Component = PageComponent as ComponentType<
						Record<string, unknown>
					>;

					return <Component {...entry.get('data').toJSON()} />;
				});
			});

			Object.entries(widgets).forEach(([widgetId, { control, preview }]) => {
				cms.registerWidget(widgetId, control, preview);
			});

			if (cloudinaryMod) {
				cms.registerMediaLibrary(cloudinary);
			}

			onInit?.(cms);
		});
	}, [cssFiles]);

	return null;
};
