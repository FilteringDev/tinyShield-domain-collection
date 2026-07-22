import test from 'ava'
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

test('skips a release when the content hash is unchanged', T => {
  const Manifest = CreateManifest(100)
  T.deepEqual(CompareReleaseManifests(Manifest, Manifest), {
    Changed: false,
    LargeDecrease: false,
    DecreasePercentage: 0
  })
})

test('allows ordinary changes and an exact 25 percent decrease', T => {
  T.deepEqual(CompareReleaseManifests(CreateManifest(90, 'b'), CreateManifest(100)), {
    Changed: true,
    LargeDecrease: false,
    DecreasePercentage: 10
  })
  T.false(CompareReleaseManifests(CreateManifest(75, 'b'), CreateManifest(100)).LargeDecrease)
})

test('blocks a decrease over 25 percent unless explicitly allowed', T => {
  const Current = CreateManifest(74, 'b')
  const Previous = CreateManifest(100)

  T.throws(() => CompareReleaseManifests(Current, Previous), {
    message: 'Normal domain count decreased by 26.00%, exceeding the 25% release limit'
  })
  T.true(CompareReleaseManifests(Current, Previous, true).LargeDecrease)
})

test('parses a valid manifest and rejects malformed counts', T => {
  const Manifest = CreateManifest(100)
  T.deepEqual(ParseDomainCollectionManifest(Manifest, 'Fixture'), Manifest)

  const InvalidManifest: unknown = {
    ...Manifest,
    Counts: { ...Manifest.Counts, Normal: 0 }
  }
  T.throws(() => ParseDomainCollectionManifest(InvalidManifest, 'Fixture'), {
    message: 'Manifest Counts.Normal must be a positive safe integer'
  })
})