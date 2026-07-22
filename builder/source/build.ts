import { copyFile, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { FetchAdShieldDomains } from '@filteringdev/tinyshield-lib/references'
import { CreateDomainArtifacts } from './domain-artifacts.js'

const ProjectRoot = new URL('../../', import.meta.url)
const OutputDirectory = new URL('dist/', ProjectRoot)
const TemporaryDirectory = new URL(`.build/domain-artifacts-${process.pid}/`, ProjectRoot)
const BuilderPackageJson = new URL('../package.json', import.meta.url)
const PackageSourceDirectory = new URL('../../source/', import.meta.url)
const JsonDeclarationFiles = new Map([
  ['normal.d.json.ts', 'normal.json.d.ts'],
  ['full.d.json.ts', 'full.json.d.ts'],
  ['each-domain.d.json.ts', 'each-domain.json.d.ts'],
  ['each-domain-full.d.json.ts', 'each-domain-full.json.d.ts'],
  ['manifest.d.json.ts', 'manifest.json.d.ts']
])

async function ReadSourcePackageVersion(): Promise<string> {
  const PackageJson: unknown = JSON.parse(await readFile(BuilderPackageJson, 'utf8'))
  if (typeof PackageJson !== 'object' || PackageJson === null) {
    throw new TypeError('Builder package.json must contain an object')
  }

  const Dependencies = (PackageJson as Record<string, unknown>)['dependencies']
  if (typeof Dependencies !== 'object' || Dependencies === null) {
    throw new TypeError('Builder package.json must contain dependencies')
  }

  const Version = (Dependencies as Record<string, unknown>)['@filteringdev/tinyshield-lib']
  if (typeof Version !== 'string' || Version.length === 0) {
    throw new TypeError('Builder package.json must pin @filteringdev/tinyshield-lib')
  }

  return Version
}

async function Build(): Promise<void> {
  await Promise.all([
    rm(OutputDirectory, { recursive: true, force: true }),
    rm(TemporaryDirectory, { recursive: true, force: true })
  ])

  try {
    const [Container, SourcePackageVersion] = await Promise.all([
      FetchAdShieldDomains(),
      ReadSourcePackageVersion()
    ])
    const Artifacts = CreateDomainArtifacts(Container, SourcePackageVersion)

    await mkdir(TemporaryDirectory, { recursive: true })
    await Promise.all([
      copyFile(new URL('domain-data.js', PackageSourceDirectory), new URL('domain-data.js', TemporaryDirectory)),
      ...[...Artifacts.Files].map(([RelativePath, Content]) => (
        writeFile(new URL(RelativePath, TemporaryDirectory), Content, 'utf8')
      )),
      ...[...JsonDeclarationFiles].map(([SourceFileName, OutputFileName]) => (
        copyFile(new URL(SourceFileName, PackageSourceDirectory), new URL(OutputFileName, TemporaryDirectory))
      ))
    ])
    await rename(TemporaryDirectory, OutputDirectory)

    console.log(`Generated ${Artifacts.Manifest.Counts.Normal} normal domains (${Artifacts.Manifest.ContentHash})`)
  } catch (Error) {
    await rm(TemporaryDirectory, { recursive: true, force: true })
    throw Error
  }
}

await Build()