# ShipLean documentation

The source for [docs.shiplean.app](https://docs.shiplean.app). Public pages explain how to set up and use ShipLean. This README is for documentation maintainers.

## Local preview

Use the Node version in `.node-version` and the pnpm version in `package.json`.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

`pnpm build` generates `dist/`, builds the Pagefind search index, and fails on broken internal Markdown or MDX links. `pnpm preview` serves the built site. `pnpm check` checks Astro and TypeScript files. The build workflow runs on pull requests and pushes to `main`.

## Pages and links

Pages live in `src/content/docs/`. All initial pages use MDX so they can import components and shared configuration. Keep each page's slug and title when you replace its outline. `src/sidebar.ts` declares the six sections and their order.

Use root-relative links with trailing slashes, such as `/start/quickstart/`. Link runnable examples to their file in `https://github.com/ShipLean/docs/blob/main/examples/` or to their download at `https://raw.githubusercontent.com/ShipLean/docs/main/examples/`. Repository files are not copied into the website automatically.

In MDX, import the published image value instead of writing it out again:

```mdx
import { image } from '@/config/site';

Use the <code>{image}</code> image.
```

Compose examples that run on their own may use the `SHIPLEAN_IMAGE` fallback. Keep that fallback in sync with `src/config/site.ts`.

## Screenshots

In an MDX page:

```mdx
import Shot from '@/components/Shot.astro';

<Shot name="ui-backlogs-overview" alt="The Stories backlog, with ranked work items, their states, and story points." />
```

The component reads `src/assets/shots/<name>-light.webp` and `<name>-dark.webp`. It follows the theme that Starlight has selected, including when that differs from the operating system. If either file is missing, the whole pair becomes a labelled placeholder, and the build prints a warning. Write descriptive alt text. CSS hides the inactive theme image from assistive technology.

The initial `ui-backlogs-overview` pair comes from the product's page-shot baselines at commit `0a9e4e139ce655f1f4ad457e7516fef3feef4bad`: `backlogs.spec.tsx-snapshots/backlog-{light,dark}-linux.png`. The pair is resized to 1440px and converted to WebP at quality 82. Keep each captured asset under 150 KB.

To capture screenshots, install Chromium once with `pnpm exec playwright install chromium`. The runner starts its own disposable Compose stack, waits for `/health`, and signs in once. For each shot and theme, it copies that session into a new browser context, restores the demo fixtures, and selects the theme under **Appearance** in **Your profile**. Reusing the session avoids using up the per-email sign-in quota on every capture. Each browser context still has its own page state. When it finishes, the runner removes the stack and its volumes. This mode requires Docker Compose and does not use `examples/quickstart/`.

Store the disposable credentials in a private JSON file outside the repo, with permissions `0600`:

```json
{"admin":{"email":"docs@example.com","password":"choose-a-disposable-password"}}
```

```sh
pnpm shots --config /path/to/private-shots.json
pnpm shots --config /path/to/private-shots.json --page ui-backlogs
pnpm shots --no-stack http://127.0.0.1:8080 --config /path/to/private-shots.json
```

Use an isolated instance. Ordinary captures restore the seed's managed DEMO fixtures through the REST API. Keep the reserved `demo-fixture.json` attachment in capture steps. Restoring covers editable fixture fields, links, attachment content, ranks, sprint and capacity settings, and board settings. Append-only history and revisions, and server-relative labels, remain as they are. `SHIPLEAN_ADMIN_EMAIL` and `SHIPLEAN_ADMIN_PASSWORD` override the admin fields in the configuration. To use an existing instance, pass `--no-stack <baseUrl>`. The runner ignores other fields in a shared runtime JSON file. The runner never prints credentials or external error details. Do not put passwords on the command line. Set `SHIPLEAN_SHOTS_PORT` to change the loopback port of the disposable stack. The default is `18080`. `SHIPLEAN_IMAGE` overrides the stack's image. Use `--browser <executable>` or `PLAYWRIGHT_EXECUTABLE_PATH` to select a browser on hosts that cannot use the pinned Playwright download.

To check browser capture without credentials or a seed, run the public sign-in sample:

```sh
pnpm shots --no-stack http://127.0.0.1:8080 --page _sample
```

`_sample` is excluded from ordinary discovery. It skips the seed and sign-in. The public login page follows the emulated operating system theme because it has no theme control. Ordinary runs dynamically import `scripts/shots/seed.ts` and fail with a clear error if the file is missing.

Page specs export `shots: ShotSpec[]` from `scripts/shots/specs/<page>.ts` and import the common types from `scripts/shots/types.ts`. `--page` selects the exact basename, without `.ts`. Omit it to run every ordinary spec. Use globally unique names with a section prefix, such as `ui-backlogs-overview`, `start-guides-first-project`, and `work-research`. A spec name is the same as its `<Shot name>`.

```ts
import type { ShotSpec } from '../types';

export const shots: ShotSpec[] = [{
  name: 'work-ideas-feature',
  route: (ctx) => '/p/DEMO/items/' + ctx.features[0],
  // Optional: steps: async (page, ctx) => { ... }
}];
```

`SeedResult` uses item keys for its epic, feature, and story arrays, and UUIDs for `projectId`, `sprint`, and `boardId`. The array order is fixed. `features[0]` is **Guide new members through their first project**. Its goal is to help a new member create a first project and find the next action. Routes are relative to the application and start with `/`. Callbacks run after seeding. Steps wait for the visible UI state they need, and they can run again. A step that creates extra data must restore its own fixtures or use a rerunnable strategy that gives the same result on every run. Do not use fixed sleeps.

The runner waits for requests, fonts, and images before capture, and it disables screenshot animations. The browser uses UTC, English, a fixed clock for the run, and a 1440×900 viewport. Optional `clip` crops are fitted inside a 1440×900 canvas. Each theme is written to `src/assets/shots/` as a WebP file of at most 150,000 bytes. Encoding starts at quality 82 and lowers quality when needed. Very noisy captures also lose some image detail, but the file keeps its 1440×900 dimensions. Review generated images before you commit them. Screenshot assets are committed separately from this pipeline.

## Other checks and integrations

These commands name the scripts that implement them:

- `pnpm test:seed` runs `scripts/shots/seed.test.ts`.
- `pnpm check:config <product-readme-path>` runs `scripts/check-config.ts`.
- `pnpm test:config` runs `scripts/check-config.test.ts`.
- `pnpm check:site` runs `scripts/checks/run.ts`, which checks external links, mobile layout, and search.

Playwright, Sharp, and tsx are installed for capture and checks. Node's test runner is available through `tsx --test`. Install the pinned Playwright browser with `pnpm exec playwright install chromium` before you run browser checks.

`starlight-openapi` is pinned for the product's OpenAPI schema, which does not exist yet. The REST API page stays a stub until the schema exists. `astro-mermaid` and its Mermaid peer are pinned for diagram pages. Neither plugin is activated until its content exists. A diagram that a page needs can use static HTML, CSS, and SVG directly in MDX. The site maintainer makes changes to the core configuration.

## Brand assets

The mark and favicon are copied unchanged from `ShipLean/shiplean.app`. `src/styles/brand.css` maps that site's Nord Frost colors and Inter typography onto Starlight. Fonts are self-hosted through `@fontsource/inter`. Readers do not need a connection to Google Fonts.
