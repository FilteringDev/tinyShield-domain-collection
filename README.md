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

`getDomainsList()` returns a fresh copy of the sorted, wildcard-expanded `Full` domain list. `isAllowedToRun()` uses binary search to match either the exact URL hostname or a parent domain at a DNS label boundary.

```js
isAllowedToRun(new URL('https://example.com/'))
// true when example.com is listed

isAllowedToRun(new URL('https://deep.a.example.com/'))
// true when example.com is listed

isAllowedToRun(new URL('https://notexample.com/'))
// false when notexample.com is not listed
```

The same functions are available from the typed `@filteringdev/tinyshield-domain-collection/lib` subpath. tinyShield should call `getDomainsList()` only from its builder so this data package is not bundled into the userscript. Runtime consumers such as Extra can use `isAllowedToRun()` to decide whether tinyShield should run for a URL.

The `Full` list is used because `Normal` may contain wildcard suffix patterns such as `domain.*`. Existing data constants remain available for compatibility:

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
| `full.json` | `string[]` | Patterns after wildcard suffix expansion. |
| `each-domain.json` | `string[][]` | Normal patterns grouped by registrable domain. |
| `each-domain-full.json` | `string[][]` | Grouped patterns after wildcard suffix expansion. |
| `manifest.json` | object | Schema, source package, counts, and canonical content hash. |

Every flat list, every group, and the list of groups are sorted by Unicode code point. The generated files do not contain timestamps, so identical source content produces byte-for-byte identical output.

`manifest.json` has this shape:

```ts
type DomainCollectionManifest = {
  readonly SchemaVersion: 1
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

The scheduled workflow runs daily at 03:17 UTC and can also be started manually. It performs these steps:

1. Lint and test the generator.
2. Fetch live domain data through the npm release of `@filteringdev/tinyshield-lib`.
3. Compare the generated hash with the manifest in the latest npm package.
4. Exit without publishing when the hash is unchanged.
5. Increment only the patch version and publish through npm trusted publishing when content changed.

The workflow fails without publishing when an upstream request, npm registry lookup, schema validation, or build fails. A decrease of more than 25 percent in the `Normal` count is also blocked. A maintainer can review the change and use the manual `allow-large-change` input to permit it.

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