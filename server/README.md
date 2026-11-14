# PASSETS account service

**Status: deferred and disabled.** See [ACCOUNT_HANDOFF.md](ACCOUNT_HANDOFF.md) for the unresolved integration issue and activation requirements. Unit-test success is not production acceptance.

The frontend continues to work on GitHub Pages. The account API is a separate, dependency-free Node.js function in `api/account.mjs`. It stores encrypted account profiles in the `passets-data` branch of `Jerryyy-Hu/passets`; no hosted database is used.

## Deployment prerequisites

Deploy the repository to a Node.js 24 Vercel project with the included `vercel.json`. Keep the existing GitHub Pages deployment enabled. Use a free Hobby project only after confirming the selected team's plan; do not upgrade a plan or add a payment method automatically.

Configure these **server-only** environment variables directly in the hosting dashboard:

| Variable | Value |
| --- | --- |
| `PASSETS_GITHUB_TOKEN` | A fine-grained token limited to this repository, with Contents read/write and no other write scopes |
| `PASSETS_DATA_SECRET` | At least 32 cryptographically random bytes, encoded as hex or base64; keep a separate owner-controlled backup |
| `PASSETS_REPOSITORY` | `Jerryyy-Hu/passets` |
| `PASSETS_DATA_BRANCH` | `passets-data` |
| `PASSETS_ALLOWED_ORIGINS` | `https://jerryyy-hu.github.io` |

Do not place credentials in the browser, `cloud-config.js`, Git, command-line arguments, logs or chat. The browser configuration contains only the public API origin. Set `window.PassetsCloudConfig.apiBase` to the verified deployment origin after provisioning.

Create `passets-data` from an existing commit before enabling account writes. Ordinary learning updates only change encrypted `profiles/<opaque-id>.json` files in that branch and do not deploy the website. Preserve the branch and the encryption key together: replacing the key makes existing records unreadable. Git history retains previous encrypted snapshots; deleting a profile in the latest tree does not erase older commits.

## Account behavior

- Usernames are case-insensitive, 3–32 ASCII letters, digits, underscores or hyphens. Passwords must be 10–128 characters.
- Passwords use salted asynchronous scrypt (`N=32768`, `r=8`, `p=3`). Account records, including password hashes, session hashes and learning data, use AES-256-GCM before any GitHub write. A server-keyed HMAC derives opaque filenames.
- Sessions use random 256-bit opaque tokens, stored as hashes inside the encrypted profile, with a 30-day expiry and independent per-device revocation. No repository token is returned to a client.
- Sign-in does not automatically import another profile or guest workspace. Guest import requires an explicit checkbox. Logout restores the guest workspace and keeps server-side records.
- Optimistic revisions and GitHub blob SHA checks reject conflicting writes. The client merges history by attempt ID, preserves conflicting drafts, unions completion keys and uses vocabulary removal timestamps to prevent deleted terms reappearing.
- Registered users refresh before entering practice and check completion with the server before receiving a new question. If the account service is unavailable, local drafts remain usable; new account-verified draws wait for a successful connection. Review mode can reuse completed questions.
- API provider keys stay local and are excluded from synchronized state.

## Operational limits

GitHub is used as a low-volume file store, not a high-throughput database. Profile reads and commits consume GitHub API limits, writes can take seconds, and simultaneous edits can require retries. Client saves are debounced and rate-limited, with immediate local persistence and explicit sync status. This design requires an external rate-limit layer before opening registration to a large audience: the service has per-instance request throttling plus persistent account lockouts, but no shared IP-level limiter. No classroom concurrency target has been tested.

The first version supports username/password registration, login and logout. It does not include email verification, password recovery, account deletion, MFA or an administration UI. Complete those flows before positioning it as a general public identity service.

## Validation

```sh
node --test tests/core.test.cjs tests/account.test.mjs
node tests/browser.test.cjs /absolute/path/to/playwright
node tests/refinements.test.cjs /absolute/path/to/playwright
```

The account tests and browser refinement tests use the real service and encryption implementation with a simulated GitHub transport. They validate isolation and synchronization without using production credentials. They do not establish real GitHub write latency, production token permissions or physical-phone keyboard behavior.

After configuring production, verify health, two temporary test accounts, two sessions on one account, completion exclusion, vocabulary cancellation and independent logout. Treat this as incomplete until the real host and repository credentials are configured and verified.

References: [GitHub API limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api), [Node.js crypto](https://nodejs.org/api/crypto.html), [Vercel Node.js Functions](https://vercel.com/docs/functions/runtimes/node-js).
