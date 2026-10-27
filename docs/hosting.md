# Hosting owner checklist

This is a note for the repository operator. The file is not part of the public documentation content.
SHIP-130 stays open and tagged Human until the owner completes this checklist.
The workflow is ready for review. No Cloudflare project, credentials, or domain has been verified from this environment.

## Create the Pages project

- [ ] Sign in to the Cloudflare account that will own the documentation.
- [ ] Create a **Direct Upload** Pages project named `shiplean-docs`, with
  production branch `main`. With Node 24.22.0 installed, run:

  ```sh
  npx --yes wrangler@4.147.0 login
  npx --yes wrangler@4.147.0 pages project create
  ```

  Enter `shiplean-docs` and `main` at the prompts, selecting the intended account.
  Record the `*.pages.dev` hostname that Cloudflare assigns. Leave Git integration
  disabled. GitHub Actions builds `dist/` and uploads it.

See [Cloudflare Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/).

## Add the repository secrets

- [ ] Create a Cloudflare API token that has the Cloudflare Pages **Edit** permission
  for the intended account. Copy that account's ID from Cloudflare.
- [ ] Add both secrets to the `ShipLean/docs` repository, using GitHub's secret prompts:

  ```sh
  gh secret set CLOUDFLARE_API_TOKEN --repo ShipLean/docs
  gh secret set CLOUDFLARE_ACCOUNT_ID --repo ShipLean/docs
  ```

  Paste the new token at the first prompt and the account ID at the second. Do not put
  either value in this file, the workflow YAML, command arguments, or commits.
- [ ] If the GitHub `production` environment has required reviewers, arrange
  approval for the first deployment.

See [Cloudflare's CI credentials guide](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/).

## Publish and attach the domain

- [ ] After the documentation PR is reviewed and merged, inspect the **Deploy
  documentation** run on `main`. The run installs the pnpm version pinned in `package.json`,
  checks and builds with Node 24.22.0, then uploads with Wrangler 4.147.0.
  Pull requests cannot deploy, and a manual retry also needs `main`:

  ```sh
  gh workflow run deploy.yml --repo ShipLean/docs --ref main
  gh run list --repo ShipLean/docs --workflow deploy.yml --limit 5
  ```

- [ ] Confirm the production deployment works at the assigned Pages hostname.
- [ ] In Cloudflare, open **Workers & Pages**, select **shiplean-docs**, and choose
  **Custom domains**. Choose **Set up a domain**, enter `docs.shiplean.app`, and complete the prompts.
- [ ] Confirm the DNS record that Cloudflare proposes. If DNS is hosted elsewhere,
  add a `CNAME` for `docs` that points to the actual assigned Pages hostname.
  Associate the domain in Pages before you add the CNAME. A DNS record alone is not enough.
- [ ] Wait for the custom domain and HTTPS certificate to become active.

See [Cloudflare custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/).

## Verify before linking

- [ ] Run `curl --fail --location --head https://docs.shiplean.app/` and open the
  site in a browser. Check a nested page, search, theme switching, and asset loading.
- [ ] Record the deployment URL and the domain verification on SHIP-130.
  Only after that, complete the Human task and release the separate SHIP-131 draft PR
  that links from shiplean.app.

The Wrangler version is pinned to match the home site's deployment pattern. Its supported
Node versions are listed in [Wrangler installation requirements](https://developers.cloudflare.com/workers/wrangler/install-and-update/).
