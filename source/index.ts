import {
	Normal as NormalData,
	Full as FullData,
	EachDomain as EachDomainData,
	EachDomainFull as EachDomainFullData,
	Manifest as ManifestData
} from './domain-data.js'

export type DomainCollectionManifest = {
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

export const Normal = NormalData as unknown as readonly string[]
export const Full = FullData as unknown as readonly string[]
export const EachDomain = EachDomainData as unknown as readonly (readonly string[])[]
export const EachDomainFull = EachDomainFullData as unknown as readonly (readonly string[])[]
export const Manifest = ManifestData as unknown as DomainCollectionManifest
export { getDomainsList, isAllowedToRun } from './lib.js'