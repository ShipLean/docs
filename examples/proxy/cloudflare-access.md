# Cloudflare Access token-mode settings

Replace `team` with your Cloudflare Zero Trust team name, `AUD_TAG` with this Access application's AUD tag, and the example host with your ShipLean hostname.

Set these ShipLean environment values:

```dotenv
SHIPLEAN_AUTH_PROXY_TOKEN_HEADER=Cf-Access-Jwt-Assertion
SHIPLEAN_AUTH_PROXY_TOKEN_ISSUER=https://team.cloudflareaccess.com
SHIPLEAN_AUTH_PROXY_TOKEN_JWKS_URL=https://team.cloudflareaccess.com/cdn-cgi/access/certs
SHIPLEAN_AUTH_PROXY_TOKEN_AUDIENCE=AUD_TAG
SHIPLEAN_AUTH_PROXY_SIGN_OUT_URL=https://team.cloudflareaccess.com/cdn-cgi/access/logout
SHIPLEAN_TRUSTED_PROXIES=10.20.0.0/24
SHIPLEAN_ADMIN_EMAIL=admin@example.com
```

In the Cloudflare dashboard, create a self-hosted Access application for `https://shiplean.example.com`. Add the identity-provider policies for users allowed to access ShipLean.

Create additional self-hosted Access applications for these paths and add a **Bypass** policy with **Everyone** as the include rule:

- `https://shiplean.example.com/mcp*`
- `https://shiplean.example.com/oauth/token*`
- `https://shiplean.example.com/oauth/register*`
- `https://shiplean.example.com/oauth/revoke*`
- `https://shiplean.example.com/.well-known/*`
- `https://shiplean.example.com/api/webhooks/*`
- `https://shiplean.example.com/api/uploads/*`
- `https://shiplean.example.com/api/downloads/*`

Cloudflare evaluates path-based applications before the hostname application. Confirm the bypass policy is limited to these protocol and transfer paths; keep `/oauth/authorize` protected. Bypassed requests must still reach the private ShipLean backend, and the webhook endpoint checks its configured shared secret.

Do not publish the ShipLean port. Allow only the reverse proxy to connect to it and use the address ShipLean sees in `SHIPLEAN_TRUSTED_PROXIES`. Keep the Cloudflare Access application AUD tag private to your deployment configuration.

Cloudflare Access sends its signed application assertion in `Cf-Access-Jwt-Assertion`, with signing keys at the JWKS URL above. The issuer is the team domain and the audience is the application's AUD tag. Access JWT validation and policy behavior are described in the official [JWT validation guide](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/) and [Access policy documentation](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/).
