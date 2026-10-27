# Hosting owner checklist

Repository operator note; this file is outside the public documentation content.
SHIP-130 stays open and tagged Human until the owner completes this checklist.
The workflow is ready for review; no Cloudflare project, credentials or domain
have been verified from this environment.

## Create the Pages project

- [ ] Sign in to the Cloudflare account that will own the documentation.
- [ ] Create a **Direct Upload** Pages project named `shiplean-docs`, with
  production branch `main`. With Node 24.22.0 installed, run:

  ```sh
  npx --yes wrangler@4.147.0 login
  npx --yes wrangler@4.147.0 pages project create
  ```

  Enter `shiplean-docs` and `main` at the prompts, selecting the intended account.
  Record the actual `*.pages.dev` hostname Cloudflare assigns. Keep Git integration
  disabled: GitHub Actions builds `dist/` and uploads it.

See [Cloudflare Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/).

## Add the repository secrets

- [ ] Create a Cloudflare API token with **Account → Cloudflare Pages → Edit**,
  scoped to the intended account. Copy that account's ID from Cloudflare.
- [ ] Add both secrets to **ShipLean/docs**, using GitHub's secret prompts:

  ```sh
  gh secret set CLOUDFLARE_API_TOKEN --repo ShipLean/docs
  gh secret set CLOUDFLARE_ACCOUNT_ID --repo ShipLean/docs
  ```

  Paste the newly created token and its account ID respectively. Do not put
  values in this file, workflow YAML, command arguments or commits.
- [ ] If the GitHub `production` environment has required reviewers, arrange
  approval for the first deployment.

See [Cloudflare's CI credentials guide](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/).

## Publish and attach the domain

- [ ] After the documentation PR is reviewed and merged, inspect the **Deploy
  documentation** run on `main`. It installs pinned pnpm from `package.json`,
  checks and builds with Node 24.22.0, then uploads with Wrangler 4.147.0.
  Pull requests cannot deploy. A manual retry also requires `main`:

  ```sh
  gh workflow run deploy.yml --repo ShipLean/docs --ref main
  gh run list --repo ShipLean/docs --workflow deploy.yml --limit 5
  ```

- [ ] Confirm the production deployment works at the assigned Pages hostname.
- [ ] In Cloudflare **Workers & Pages → shiplean-docs → Custom domains**, choose
  **Set up a domain**, enter `docs.shiplean.app` and complete the prompts.
- [ ] Confirm the DNS record Cloudflare proposes. If DNS is hosted elsewhere,
  add a `CNAME` for `docs` pointing to the actual assigned Pages hostname.
  Associate the domain in Pages before adding the CNAME; DNS alone is insufficient.
- [ ] Wait for the custom domain and HTTPS certificate to become active.

See [Cloudflare custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/).

## Verify before linking

- [ ] Run `curl --fail --location --head https://docs.shiplean.app/` and open the
  site in a browser. Check a nested page, search, theme switching and asset loads.
- [ ] Record the successful deployment URL and domain verification on SHIP-130.
  Only then complete the Human task and release the separate SHIP-131 draft PR
  that links from shiplean.app.

Wrangler is pinned to match the home site's deployment pattern. Its supported
Node versions are documented in [Wrangler installation requirements](https://developers.cloudflare.com/workers/wrangler/install-and-update/).
