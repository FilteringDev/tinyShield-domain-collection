# Third-party notices

This project uses the published `@filteringdev/tinyshield-lib` package to retrieve and normalize domain data. It does not copy the fetcher implementation into this repository.

## tinyShield library

- Package: `@filteringdev/tinyshield-lib`
- Repository: <https://github.com/FilteringDev/tinyShield>
- License: Mozilla Public License 2.0

The library is a build-time dependency and is not included in this package's published `dist` directory.

## AdGuard Filters

- Source: <https://adguardteam.github.io/AdguardFilters/BaseFilter/sections/specific.txt>
- Repository: <https://github.com/AdguardTeam/AdguardFilters>
- Repository license: GNU General Public License version 3
- License text: <https://github.com/AdguardTeam/AdguardFilters/blob/master/LICENSE>

The tinyShield library extracts domains from the Ad-Shield ad reinsertion section of the AdGuard Base Filter.

## uBlock Origin uAssets

- Source: <https://ublockorigin.github.io/uAssets/filters/filters.min.txt>
- Repository: <https://github.com/uBlockOrigin/uAssets>
- Repository license: GNU General Public License version 3
- License text: <https://github.com/uBlockOrigin/uAssets/blob/master/LICENSE>

The tinyShield library extracts domains from the Ad-Shield section of the uBlock Origin filter assets.

## Ad-Shield sellers data

- Source: <https://info.ad-shield.io/sellers.json>
- Provider contact published in the source: `sales@ad-shield.io`

The source publishes seller identifiers, names, domains, seller types, and contact information. No explicit license field or license notice was present in the fetched JSON when this notice was written on 2026-07-22. This project does not grant additional rights to that source data.

## Generated collection

The published domain collection combines and transforms values obtained from the sources above and includes tinyShield's custom include and exclude decisions. Third-party names and trademarks remain the property of their respective owners. Review the upstream terms when using or redistributing the generated collection.