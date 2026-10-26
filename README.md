# ShipLean documentation

The source for [docs.shiplean.app](https://docs.shiplean.app). Public pages cover setting up and using ShipLean. This README is for documentation maintainers.

## Local preview

Use the Node version in `.node-version` and the pnpm version in `package.json`.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

`pnpm build` generates `dist/`, builds the Pagefind search index, and fails on broken internal Markdown or MDX links. `pnpm preview` serves the built site. `pnpm check` checks Astro and TypeScript files. The build workflow runs on pull requests and pushes to `main`.

## Pages and links

Pages live in `src/content/docs/`. All initial pages use MDX so they can import components and shared configuration. Keep each page's slug and title when replacing its outline. `src/sidebar.ts` declares the six sections and their order.

Use root-relative links with trailing slashes, such as `/start/quickstart/`. Link runnable examples to their file in `https://github.com/ShipLean/docs/blob/main/examples/` or their download at `https://raw.githubusercontent.com/ShipLean/docs/main/examples/`; repository files are not automatically copied into the website.

Import the published image value in MDX rather than spelling it again:

```mdx
import { image } from '@/config/site';

Use the <code>{image}</code> image.
```

Independently runnable Compose examples may use the agreed `SHIPLEAN_IMAGE` fallback. Keep that fallback in sync with `src/config/site.ts`.

## Screenshots

In an MDX page:

```mdx
import Shot from '@/components/Shot.astro';

<Shot name="ui-backlogs-overview" alt="The Stories backlog, with ranked work items, their states, and story points." />
```

The component reads `src/assets/shots/<name>-light.webp` and `<name>-dark.webp`. It follows Starlight's selected theme, including when that differs from the operating system. If either file is absent, the whole pair becomes a labelled placeholder and the build warns. Use descriptive alt text; the hidden theme image is hidden from assistive technology by CSS.

The initial `ui-backlogs-overview` pair comes from the product's page-shot baselines at commit `0a9e4e139ce655f1f4ad457e7516fef3feef4bad`: `backlogs.spec.tsx-snapshots/backlog-{light,dark}-linux.png`. It is resized to 1440px and converted to WebP at quality 82. Keep each captured asset under 150 KB.

`pnpm shots` is reserved for `scripts/shots/run.ts`; the capture runner and seed are added separately. Page specs export `shots: ShotSpec[]` from `scripts/shots/specs/<page>.ts` and import the common types from `scripts/shots/types.ts`. Use unique section-prefixed names such as `ui-backlogs`, `start-guides-first-project`, and `work-research`. A spec name equals its `<Shot name>`; `--page` will select the exact spec basename.

`SeedResult` uses item keys for its epic, feature, and story arrays, and UUIDs for `projectId`, `sprint`, and `boardId`. Array order is deterministic. `features[0]` is **Guide new members through their first project**, whose goal is to help a new member create their first project and find the next action. A dynamic route can use `(ctx) => '/p/DEMO/items/' + ctx.features[0]`. Each shot/theme must start from restored seed state.

## Other checks and integrations

The foundation reserves these commands for their implementations:

- `pnpm test:seed` → `scripts/shots/seed.test.ts`.
- `pnpm check:config <product-readme-path>` → `scripts/check-config.ts`.
- `pnpm test:config` → `scripts/check-config.test.ts`.
- `pnpm check:site` → `scripts/checks/run.ts` (external links, mobile layout, and search).

Playwright, Sharp, and tsx are installed for capture and checks. Node's test runner is available through `tsx --test`. Install the pinned Playwright browser with `pnpm exec playwright install chromium` before browser checks.

`starlight-openapi` is pinned for the future product OpenAPI schema; the REST API page stays a stub until that schema exists. `astro-mermaid` and its Mermaid peer are pinned for diagram pages. Neither plugin is activated before its content exists. Required page diagrams can use static HTML, CSS, and SVG directly in MDX. Core configuration changes belong to the site maintainer.

## Brand assets

The mark and favicon are copied unchanged from `ShipLean/shiplean.app`. `src/styles/brand.css` maps that site's Nord Frost colors and Inter typography to Starlight. Fonts are self-hosted through `@fontsource/inter`; readers do not need a Google Fonts connection.
