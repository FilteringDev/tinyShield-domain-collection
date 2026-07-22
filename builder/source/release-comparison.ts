import type { DomainCollectionManifest } from './domain-artifacts.js'

export type ReleaseDecision = {
  Changed: boolean
  LargeDecrease: boolean
  DecreasePercentage: number
}

function IsRecord(Value: unknown): Value is Record<string, unknown> {
  return typeof Value === 'object' && Value !== null && !Array.isArray(Value)
}

function ParseCount(Counts: Record<string, unknown>, Name: string): number {
  const Count = Counts[Name]
  if (!Number.isSafeInteger(Count) || (Count as number) <= 0) {
    throw new TypeError(`Manifest Counts.${Name} must be a positive safe integer`)
  }
  return Count as number
}

export function ParseDomainCollectionManifest(Value: unknown, Name: string): DomainCollectionManifest {
  if (!IsRecord(Value)) throw new TypeError(`${Name} must contain an object`)
  if (Value['SchemaVersion'] !== 1) throw new TypeError(`${Name} has an unsupported SchemaVersion`)
  if (typeof Value['ContentHash'] !== 'string' || !/^[a-f0-9]{64}$/.test(Value['ContentHash'])) {
    throw new TypeError(`${Name} must contain a SHA-256 ContentHash`)
  }
  if (Value['SourcePackage'] !== '@filteringdev/tinyshield-lib') {
    throw new TypeError(`${Name} has an unsupported SourcePackage`)
  }
  if (typeof Value['SourcePackageVersion'] !== 'string' || Value['SourcePackageVersion'].length === 0) {
    throw new TypeError(`${Name} must contain SourcePackageVersion`)
  }
  if (!IsRecord(Value['Counts'])) throw new TypeError(`${Name} must contain Counts`)

  return {
    SchemaVersion: 1,
    ContentHash: Value['ContentHash'],
    SourcePackage: '@filteringdev/tinyshield-lib',
    SourcePackageVersion: Value['SourcePackageVersion'],
    Counts: {
      Normal: ParseCount(Value['Counts'], 'Normal'),
      Full: ParseCount(Value['Counts'], 'Full'),
      EachDomain: ParseCount(Value['Counts'], 'EachDomain'),
      EachDomainFull: ParseCount(Value['Counts'], 'EachDomainFull')
    }
  }
}

export function CompareReleaseManifests(
  Current: DomainCollectionManifest,
  Previous: DomainCollectionManifest,
  AllowLargeChange: boolean = false
): ReleaseDecision {
  if (Current.ContentHash === Previous.ContentHash) {
    return { Changed: false, LargeDecrease: false, DecreasePercentage: 0 }
  }

  const DecreasePercentage = Math.max(0, ((Previous.Counts.Normal - Current.Counts.Normal) / Previous.Counts.Normal) * 100)
  const LargeDecrease = Current.Counts.Normal * 4 < Previous.Counts.Normal * 3

  if (LargeDecrease && !AllowLargeChange) {
    throw new Error(`Normal domain count decreased by ${DecreasePercentage.toFixed(2)}%, exceeding the 25% release limit`)
  }

  return { Changed: true, LargeDecrease, DecreasePercentage }
}