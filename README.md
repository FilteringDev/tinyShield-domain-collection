# tinyShield domain collection

`@filteringdev/tinyshield-domain-collection` publishes deterministic snapshots of the domain views returned by `@filteringdev/tinyshield-lib/references`.

The package is generated once per day. A new patch version is published only when the canonical domain content changes.

## Install

```sh
npm install @filteringdev/tinyshield-domain-collection
```

Use the library functions from the package entry point:

```js
import { getDomainsList, isAllowedToRun } from '@filteringdev/tinyshield-domain-collection'

const domains = getDomainsList()
const allowed = isAllowedToRun(new URL('https://sub.example.com/path'))
```

`getDomainsList()` returns a fresh copy of the sorted `Full` list of collected domains and original suffix-wildcard patterns. `isAllowedToRun()` accepts HTTP(S) URLs, matches exact or parent domains at a DNS label boundary, and recognizes original patterns such as `example.*`, including multi-label suffixes. An original `example.*` also matches `example.com.evil` because all suffixes are allowed.

```js
isAllowedToRun(new URL('https://example.com/'))
// true when example.com is listed

isAllowedToRun(new URL('https://deep.a.example.com/'))
// true when example.com is listed

isAllowedToRun(new URL('https://notexample.com/'))
// false when notexample.com is not listed
```

The same functions are available from the typed `@filteringdev/tinyshield-domain-collection/lib` subpath. tinyShield should call `getDomainsList()` only from its builder so this data package is not bundled into the userscript. Runtime consumers such as Extra can use `isAllowedToRun()` to decide whether tinyShield should run for a URL.

The `Full` list is used for matching because `Normal` may contain synthetic wildcard groups that must not match uncollected suffixes. The data constants remain available:

```js
import {
  Normal,
  Full,
  EachDomain,
  EachDomainFull,
  Manifest
} from '@filteringdev/tinyshield-domain-collection'
```

Individual JSON files are also exported:

```js
import Normal from '@filteringdev/tinyshield-domain-collection/normal.json' with { type: 'json' }
```

## Published files

| Export | JSON shape | Description |
| --- | --- | --- |
| `normal.json` | `string[]` | Deduplicated domain patterns from the tinyShield fetcher. |
| `full.json` | `string[]` | Collected domains and original suffix-wildcard patterns, without expansion. |
| `each-domain.json` | `string[][]` | Normal patterns grouped by registrable domain. |
| `each-domain-full.json` | `string[][]` | Collected matching rules grouped by registrable domain name. |
| `manifest.json` | object | Schema, source package, counts, and canonical content hash. |

Every flat list, every group, and the list of groups are sorted by Unicode code point. The generated files do not contain timestamps, so identical source content produces byte-for-byte identical output.

`manifest.json` has this shape:

```ts
type DomainCollectionManifest = {
  readonly SchemaVersion: 2
  readonly ContentHash: string
  readonly SourcePackage: '@filteringdev/tinyshield-lib'
  readonly SourcePackageVersion: string
  readonly Counts: {
    readonly Normal: number
    readonly Full: number
    readonly EachDomain: number
    readonly EachDomainFull: number
  }
}
```

`EachDomain` and `EachDomainFull` counts are group counts. `ContentHash` is a SHA-256 digest of the four canonical domain payloads and excludes package versions and build time.

## Updating

The scheduled workflow runs daily at 00:00 UTC and can also be started manually. Before enabling schema 2 builds, publish a wildcard-preserving `@filteringdev/tinyshield-lib` release and update the builder's pinned dependency. The build rejects older expanded data. Schema 2 changes the meaning of `Full` and `EachDomainFull`; consumers must handle original `.*` patterns and must not interpret synthetic `Normal` groups as matching rules.

The workflow performs these steps:

1. Lint and test the generator.
2. Fetch live domain data through the npm release of `@filteringdev/tinyshield-lib`.
3. Download the latest npm package with retries and compare its manifest with the generated hash.
4. Exit without publishing when the hash is unchanged.
5. Increment the major version for a schema upgrade, otherwise increment the patch version, and publish through npm trusted publishing when content changed or a prerelease is promoted.

When the latest npm package is a prerelease, the workflow promotes it to a stable version even when the domain hash is unchanged. The workflow fails without publishing when an upstream request, repeated npm registry lookup, schema validation, or build fails. A decrease of more than 25 percent in the `Normal` count is also blocked. A maintainer can review the change and use the manual `allow-large-change` input to permit it.

Generated files and workflow-only version changes are not committed to Git or tagged.

## Development

Node.js 24 and pnpm are required.

```sh
pnpm install --no-lockfile
npm run lint
npm test
npm run build
npm run pack:check
```

Unit tests use fixtures and do not access the network. `npm run build` is the live integration check and writes the public package to `dist/`.

## First npm release

Trusted publishing can be configured only after the package exists on npm. A maintainer must publish the verified `0.0.1` package once using interactive npm authentication and two-factor authentication.

After the first release, configure the npm package's trusted publisher with:

- Provider: GitHub Actions
- Organization: `FilteringDev`
- Repository: `tinyShield-domain-collection`
- Workflow filename: `publish.yml`
- Allowed action: `npm publish`

Then run the workflow manually to verify OIDC authentication. The workflow requires Node 24, npm 11.5.1 or newer, a GitHub-hosted runner, and `id-token: write`. It does not use a long-lived npm token. npm automatically creates provenance for eligible public repository publishes.

## Sources and licensing

The generator code in this repository is MIT licensed. Generated data is assembled from third-party sources through `@filteringdev/tinyshield-lib`; those sources retain their own terms. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) before redistributing the data.