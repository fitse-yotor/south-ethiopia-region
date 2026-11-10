# Security

## Incident: hidden malicious code (found 2 Nov 2026)

Commits `5684d38` and `0acafd9` (28 Sep 2026) contained obfuscated JavaScript hidden off-screen
behind long runs of whitespace:

- `api.js` – run by `npm run dev`, `npm run build` and `npm start` (`node api.js && …`).
- `postcss.config.mjs` – the normal config was followed by an obfuscated loader that executed on
  every CSS build, including Vercel deployments.

When run, the code contacted an Ethereum RPC endpoint (`eth-mainnet.public.blastapi.io`) to fetch a
second-stage payload — a known pattern of info-stealer malware that targets browser passwords,
crypto wallets, SSH keys and environment variables.

**Removed in `2138601`.** Hardening added afterwards:

- Unused template build tooling (Vite/Cloudflare/wrangler installers and scripts) removed; the
  project now uses only `next dev`, `next build` and `next start`.
- `scripts/security-guard.mjs` (`npm run security:check`) fails on whitespace-hidden code,
  obfuscation patterns, blockchain loaders, `eval`, and npm scripts that run unexpected files.
  It runs in CI on every push and pull request.
- CI installs with `--ignore-scripts` and fails on high/critical production advisories.
- Dependabot keeps dependencies patched; security headers (CSP, HSTS, frame and MIME protection)
  are set in `next.config.ts`.

### Owner checklist

1. Anyone who ran `npm run dev/build/start` on this repo before 2 Nov 2026 should treat that
   computer as compromised: run an antivirus scan, change passwords saved in browsers, move crypto
   wallets to new keys, and rotate SSH keys and GitHub tokens.
2. Rotate every secret stored in the Vercel project and review its deployment logs.
3. Review who has write access to the GitHub repository and enable 2FA and branch protection on
   `main` (require the CI check to pass).
4. The malicious files still exist in the two old commits. Do not check out or build those
   commits. Removing them from history requires a force-push that rewrites `main`; do this only
   with all collaborators informed.

## Reporting a vulnerability

Email the repository owner privately. Please do not open a public issue for security problems.
