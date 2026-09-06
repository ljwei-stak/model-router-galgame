# Release Synchronization

- Synchronize releases only when the user requests an update. Do not create
  scheduled synchronization jobs.
- Compare this repository's package version with all stable npm versions of
  `@ljwei-stak/model-router-galgame` using semantic version ordering. Never
  downgrade either side or assume the `latest` tag is the highest version.
- When npm is newer, recover the corresponding complete source checkout and
  verify its published files against the npm tarball before pushing GitHub.
  The npm package currently excludes client source, scripts, tests, and assets;
  importing the tarball alone is not a complete source synchronization.
- When GitHub is newer, run tests and verify the generated client, then publish
  that same version and verify the registry payload. Do not add features or bump
  the version solely to synchronize an existing release.
- Equal version numbers require equal package contents. npm versions cannot be
  overwritten; report conflicting contents instead of silently replacing them.
- Run `npm test` and `npm run check:client`. A skipped client build does not count
  as validation. The current build requires the sibling DSH-Desktop checkout.
- Keep the release's `v<version>` tag on its verified source commit. Never move
  an existing tag or force-push over concurrent work.
- Preserve published file bytes, including line endings, and verify the final
  GitHub checkout against npm after pushing.
