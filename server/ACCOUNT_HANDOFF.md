# Deferred account work

Account activation is explicitly deferred. Publish guest practice refinements on the existing GitHub Pages site. Keep `cloud-config.js` empty and the account entry hidden. No new hosting service, database, credentials or payment method has been provisioned.

The draft API uses encrypted files on a proposed `passets-data` branch in the current repository. The branch and runtime are not configured. A conventional username/password system needs a writable API in addition to GitHub Pages. The previously discussed Vercel runtime has not been approved. A GitHub-only alternative could use each repository owner's/collaborator's GitHub authorization; it cannot serve ordinary visitors as independent users and has not been implemented.

The seven account-service unit tests pass with a simulated GitHub transport. The opt-in browser account scenarios (`PASSETS_TEST_ACCOUNTS=1`) are not stable: the second-device completion test has intermittently observed a stale completion ledger after the first device archives and awaits `flush(true)`. Investigate synchronization acknowledgment, queued writes and remote refresh ordering before activation. Do not describe the account implementation as accepted or production-ready.

The default frontend refinement suite excludes these deferred account scenarios and still runs the completed guest, mobile, theme, vocabulary, history and backup checks. Source files are retained to support resumption; real hosting permissions, secret handling, account recovery and production verification remain outstanding.
