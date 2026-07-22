import { createHash } from 'node:crypto'

const SourcePackage = '@filteringdev/tinyshield-lib'

export type DomainCollectionManifest = {
  SchemaVersion: 1
  ContentHash: string
  SourcePackage: typeof SourcePackage
  SourcePackageVersion: string
  Counts: {
    Normal: number
    Full: number
    EachDomain: number
    EachDomainFull: number
  }
}

export type DomainArtifacts = {
  Files: ReadonlyMap<string, string>
  Manifest: DomainCollectionManifest
}

function CompareCodePoints(Left: string, Right: string): number {
  const LeftPoints = [...Left].map(Character => Character.codePointAt(0) as number)
  const RightPoints = [...Right].map(Character => Character.codePointAt(0) as number)
  const ShortestLength = Math.min(LeftPoints.length, RightPoints.length)

  for (let Index = 0; Index < ShortestLength; Index += 1) {
    const Difference = LeftPoints[Index] - RightPoints[Index]
    if (Difference !== 0) return Difference
  }

  return LeftPoints.length - RightPoints.length
}

function CompareGroups(Left: readonly string[], Right: readonly string[]): number {
  const ShortestLength = Math.min(Left.length, Right.length)

  for (let Index = 0; Index < ShortestLength; Index += 1) {
    const Difference = CompareCodePoints(Left[Index], Right[Index])
    if (Difference !== 0) return Difference
  }

  return Left.length - Right.length
}

function NormalizeFlatView(Value: unknown, Name: string): string[] {
  if (!(Value instanceof Set) || Value.size === 0) {
    throw new TypeError(`${Name} must be a non-empty Set`)
  }

  const Domains = [...Value]
  if (!Domains.every(Domain => typeof Domain === 'string' && Domain.length > 0)) {
    throw new TypeError(`${Name} must contain only non-empty strings`)
  }

  return (Domains as string[]).sort(CompareCodePoints)
}

function NormalizeGroupedView(Value: unknown, Name: string): string[][] {
  if (!(Value instanceof Set) || Value.size === 0) {
    throw new TypeError(`${Name} must be a non-empty Set`)
  }

  const Groups = [...Value].map((Group, Index) => {
    if (!(Group instanceof Set) || Group.size === 0) {
      throw new TypeError(`${Name}[${Index}] must be a non-empty Set`)
    }

    const Domains = [...Group]
    if (!Domains.every(Domain => typeof Domain === 'string' && Domain.length > 0)) {
      throw new TypeError(`${Name}[${Index}] must contain only non-empty strings`)
    }

    return (Domains as string[]).sort(CompareCodePoints)
  })

  return Groups.sort(CompareGroups)
}

function SerializeJson(Value: unknown): string {
  return `${JSON.stringify(Value, null, 2)}\n`
}

function CreateContentHash(Normal: string[], Full: string[], EachDomain: string[][], EachDomainFull: string[][]): string {
  const CanonicalPayload = JSON.stringify({ Normal, Full, EachDomain, EachDomainFull })
  return createHash('sha256').update(CanonicalPayload).digest('hex')
}

export function CreateDomainArtifacts(Container: unknown, SourcePackageVersion: string): DomainArtifacts {
  if (!(Container instanceof Map)) {
    throw new TypeError('Domain container must be a Map')
  }
  if (SourcePackageVersion.length === 0) {
    throw new TypeError('Source package version must not be empty')
  }

  const Normal = NormalizeFlatView(Container.get('Normal'), 'Normal')
  const Full = NormalizeFlatView(Container.get('Full'), 'Full')
  const EachDomain = NormalizeGroupedView(Container.get('EachDomain'), 'EachDomain')
  const EachDomainFull = NormalizeGroupedView(Container.get('EachDomainFull'), 'EachDomainFull')
  const Manifest: DomainCollectionManifest = {
    SchemaVersion: 1,
    ContentHash: CreateContentHash(Normal, Full, EachDomain, EachDomainFull),
    SourcePackage,
    SourcePackageVersion,
    Counts: {
      Normal: Normal.length,
      Full: Full.length,
      EachDomain: EachDomain.length,
      EachDomainFull: EachDomainFull.length
    }
  }
  const Files = new Map<string, string>([
    ['normal.json', SerializeJson(Normal)],
    ['full.json', SerializeJson(Full)],
    ['each-domain.json', SerializeJson(EachDomain)],
    ['each-domain-full.json', SerializeJson(EachDomainFull)],
    ['manifest.json', SerializeJson(Manifest)]
  ])

  return { Files, Manifest }
}