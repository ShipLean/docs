import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightLinksValidator from 'starlight-links-validator';
import { sidebar } from './src/sidebar.ts';

export default defineConfig({
  site: 'https://docs.shiplean.app',
  trailingSlash: 'always',
  integrations: [
    starlight({
      title: 'ShipLean',
      // A custom 404 page avoids duplicate routes and missing-entry warnings.
      disable404Route: true,
      description: 'Set up ShipLean, use the app, connect agents, and take work from idea to done.',
      logo: {
        light: './src/assets/brand/shiplean-mark-light.svg',
        dark: './src/assets/brand/shiplean-mark-dark.svg',
        replacesTitle: false,
      },
      favicon: '/favicon.svg',
      customCss: ['./src/styles/brand.css'],
      sidebar,
      plugins: [starlightLinksValidator()],
    }),
  ],
});
