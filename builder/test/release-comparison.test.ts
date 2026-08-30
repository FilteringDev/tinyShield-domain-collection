import { test, expect } from 'vitest'
import type { DomainCollectionManifest } from '../source/domain-artifacts.js'
import { CompareReleaseManifests, ParseDomainCollectionManifest } from '../source/release-comparison.js'

function CreateManifest(Normal: number, HashCharacter: string = 'a'): DomainCollectionManifest {
  return {
    SchemaVersion: 1,
    ContentHash: HashCharacter.repeat(64),
    SourcePackage: '@filteringdev/tinyshield-lib',
    SourcePackageVersion: '4.0.5',
    Counts: {
      Normal,
      Full: Normal,
      EachDomain: Normal,
      EachDomainFull: Normal
    }
  }
}

test('skips a release when the content hash is unchanged', () => {
  const Manifest = CreateManifest(100)
  expect(CompareReleaseManifests(Manifest, Manifest)).toEqual({
    Changed: false,
    LargeDecrease: false,
    DecreasePercentage: 0
  })
})

test('forces a release when promoting a prerelease baseline', () => {
  const Manifest = CreateManifest(100)
  expect(CompareReleaseManifests(Manifest, Manifest, false, true)).toEqual({
    Changed: true,
    LargeDecrease: false,
    DecreasePercentage: 0
  })
})

test('allows ordinary changes and an exact 25 percent decrease', () => {
  expect(CompareReleaseManifests(CreateManifest(90, 'b'), CreateManifest(100))).toEqual({
    Changed: true,
    LargeDecrease: false,
    DecreasePercentage: 10
  })
  expect(CompareReleaseManifests(CreateManifest(75, 'b'), CreateManifest(100)).LargeDecrease).toBe(false)
})

test('blocks a decrease over 25 percent unless explicitly allowed', () => {
  const Current = CreateManifest(74, 'b')
  const Previous = CreateManifest(100)

  expect(() => CompareReleaseManifests(Current, Previous)).toThrow('Normal domain count decreased by 26.00%, exceeding the 25% release limit')
  expect(CompareReleaseManifests(Current, Previous, true).LargeDecrease).toBe(true)
})

test('parses a valid manifest and rejects malformed counts', () => {
  const Manifest = CreateManifest(100)
  expect(ParseDomainCollectionManifest(Manifest, 'Fixture')).toEqual(Manifest)

  const InvalidManifest: unknown = {
    ...Manifest,
    Counts: { ...Manifest.Counts, Normal: 0 }
  }
  expect(() => ParseDomainCollectionManifest(InvalidManifest, 'Fixture')).toThrow('Manifest Counts.Normal must be a positive safe integer')
})