import { copyFile, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import test, { type ExecutionContext } from 'ava'
import { CreateDomainArtifacts, type DomainArtifacts } from '../source/domain-artifacts.js'

function CreateContainer(Reverse: boolean = false): Map<string, Set<string> | Set<Set<string>>> {
  const Order = <Value>(Values: Value[]): Value[] => Reverse ? Values.reverse() : Values

  return new Map<string, Set<string> | Set<Set<string>>>([
    ['Normal', new Set(Order(['z.example', 'example.*', 'm.example']))],
    ['Full', new Set(Order(['z.example', 'test.org', 'middle.net', 'example.com', 'a.example']))],
    ['EachDomain', new Set(Order([
      new Set(Order(['z.example', 'a.example'])),
      new Set(Order(['beta.test', 'alpha.test']))
    ]))],
    ['EachDomainFull', new Set(Order([
      new Set(Order(['https://z.example/*', 'https://a.example/*'])),
      new Set(Order(['https://beta.test/*', 'https://alpha.test/*']))
    ]))]
  ])
}

function ParseJsonFile(Artifacts: DomainArtifacts, Name: string): unknown {
  const Content = Artifacts.Files.get(Name)
  if (typeof Content === 'undefined') throw new Error(`Missing generated file: ${Name}`)
  return JSON.parse(Content)
}

async function ImportGeneratedLibrary(T: ExecutionContext) {
  const TemporaryDirectory = await mkdtemp(join(tmpdir(), 'tinyshield-domains-'))
  T.teardown(async () => rm(TemporaryDirectory, { recursive: true, force: true }))

  const Artifacts = CreateDomainArtifacts(CreateContainer(), '4.0.5')
  await Promise.all([
    writeFile(join(TemporaryDirectory, 'package.json'), '{"type":"module"}\n', 'utf8'),
    copyFile(new URL('../../source/index.ts', import.meta.url), join(TemporaryDirectory, 'index.ts')),
    copyFile(new URL('../../source/lib.ts', import.meta.url), join(TemporaryDirectory, 'lib.ts')),
    copyFile(new URL('../../source/domain-data.js', import.meta.url), join(TemporaryDirectory, 'domain-data.js')),
    writeFile(join(TemporaryDirectory, 'index.js'), 'export * from "./index.ts"\n', 'utf8'),
    writeFile(join(TemporaryDirectory, 'lib.js'), 'export { getDomainsList, isAllowedToRun } from "./lib.ts"\n', 'utf8'),
    ...[...Artifacts.Files].map(([RelativePath, Content]) => (
      writeFile(join(TemporaryDirectory, RelativePath), Content, 'utf8')
    ))
  ])

  const Library = await import(pathToFileURL(join(TemporaryDirectory, 'lib.js')).href) as {
    getDomainsList(): string[]
    isAllowedToRun(Url: URL): boolean
  }
  const Root = await import(pathToFileURL(join(TemporaryDirectory, 'index.js')).href) as {
    Full: string[]
    getDomainsList(): string[]
    isAllowedToRun(Url: URL): boolean
  }

  return { Library, Root }
}

test('normalizes flat and grouped domain views', T => {
  const Artifacts = CreateDomainArtifacts(CreateContainer(), '4.0.5')

  T.deepEqual(ParseJsonFile(Artifacts, 'normal.json'), [
    'example.*',
    'm.example',
    'z.example'
  ])
  T.deepEqual(ParseJsonFile(Artifacts, 'each-domain.json'), [
    ['a.example', 'z.example'],
    ['alpha.test', 'beta.test']
  ])
})

test('produces identical files for different insertion orders', T => {
  const Forward = CreateDomainArtifacts(CreateContainer(), '4.0.5')
  const Reverse = CreateDomainArtifacts(CreateContainer(true), '4.0.5')

  T.deepEqual([...Forward.Files], [...Reverse.Files])
  T.is(Forward.Manifest.ContentHash, Reverse.Manifest.ContentHash)
})

test('records source metadata and view counts', T => {
  const Artifacts = CreateDomainArtifacts(CreateContainer(), '4.0.5')

  T.regex(Artifacts.Manifest.ContentHash, /^[a-f0-9]{64}$/)
  T.deepEqual(Artifacts.Manifest, {
    SchemaVersion: 1,
    ContentHash: Artifacts.Manifest.ContentHash,
    SourcePackage: '@filteringdev/tinyshield-lib',
    SourcePackageVersion: '4.0.5',
    Counts: {
      Normal: 3,
      Full: 5,
      EachDomain: 2,
      EachDomainFull: 2
    }
  })
})

test('rejects missing and empty views', T => {
  T.throws(() => CreateDomainArtifacts(new Map(), '4.0.5'), {
    message: 'Normal must be a non-empty Set'
  })

  const EmptyGroup = CreateContainer()
  EmptyGroup.set('EachDomain', new Set([new Set()]))
  T.throws(() => CreateDomainArtifacts(EmptyGroup, '4.0.5'), {
    message: 'EachDomain[0] must be a non-empty Set'
  })
})

test('rejects non-string domains and an empty source version', T => {
  const InvalidDomain = CreateContainer() as Map<string, Set<unknown>>
  InvalidDomain.set('Full', new Set([42]))

  T.throws(() => CreateDomainArtifacts(InvalidDomain, '4.0.5'), {
    message: 'Full must contain only non-empty strings'
  })
  T.throws(() => CreateDomainArtifacts(CreateContainer(), ''), {
    message: 'Source package version must not be empty'
  })
})

test('generated library exposes a sorted, mutation-isolated domain API', async T => {
  const { Library, Root } = await ImportGeneratedLibrary(T)
  const ExpectedDomains = ['a.example', 'example.com', 'middle.net', 'test.org', 'z.example']

  const FirstList = Library.getDomainsList()
  const SecondList = Library.getDomainsList()
  T.deepEqual(FirstList, ExpectedDomains)
  T.deepEqual(SecondList, ExpectedDomains)
  T.not(FirstList, SecondList)

  FirstList.splice(0, FirstList.length, 'changed.invalid')
  Root.Full.splice(0, Root.Full.length, 'changed.invalid')
  T.deepEqual(Library.getDomainsList(), ExpectedDomains)

  T.is(Root.getDomainsList, Library.getDomainsList)
  T.is(Root.isAllowedToRun, Library.isAllowedToRun)
})

test('isAllowedToRun matches exact domains and label-boundary suffixes', async T => {
  const { Library } = await ImportGeneratedLibrary(T)

  T.true(Library.isAllowedToRun(new URL('https://a.example/')))
  T.true(Library.isAllowedToRun(new URL('https://middle.net/')))
  T.true(Library.isAllowedToRun(new URL('https://z.example/')))
  T.true(Library.isAllowedToRun(new URL('https://sub.example.com/')))
  T.true(Library.isAllowedToRun(new URL('https://deep.a.b.example.com/')))
  T.true(Library.isAllowedToRun(new URL('https://EXAMPLE.COM/')))
  T.true(Library.isAllowedToRun(new URL('https://example.com./')))
  T.false(Library.isAllowedToRun(new URL('https://notexample.com/')))
  T.false(Library.isAllowedToRun(new URL('https://other.org/')))
})