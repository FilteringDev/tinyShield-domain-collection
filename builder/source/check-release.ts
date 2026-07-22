import { appendFile, readFile } from 'node:fs/promises'
import * as Process from 'node:process'
import { CompareReleaseManifests, ParseDomainCollectionManifest } from './release-comparison.js'

const CurrentManifestPath = new URL('../../dist/manifest.json', import.meta.url)

function ReadRequiredArgument(Name: string): string {
  const Index = Process.argv.indexOf(Name)
  const Value = Process.argv[Index + 1]
  if (Index === -1 || typeof Value === 'undefined' || Value.startsWith('--')) {
    throw new TypeError(`Missing required argument: ${Name}`)
  }
  return Value
}

async function ReadManifest(Path: URL | string, Name: string) {
  const Value: unknown = JSON.parse(await readFile(Path, 'utf8'))
  return ParseDomainCollectionManifest(Value, Name)
}

async function AppendWorkflowFile(Path: string | undefined, Content: string): Promise<void> {
  if (typeof Path !== 'undefined') await appendFile(Path, Content, 'utf8')
}

async function CheckRelease(): Promise<void> {
  const PreviousManifestPath = ReadRequiredArgument('--previous-manifest')
  const AllowLargeChange = Process.argv.includes('--allow-large-change')
  const ForcePublish = Process.argv.includes('--force-publish')
  const [Current, Previous] = await Promise.all([
    ReadManifest(CurrentManifestPath, 'Current manifest'),
    ReadManifest(PreviousManifestPath, 'Previous manifest')
  ])
  const Decision = CompareReleaseManifests(Current, Previous, AllowLargeChange, ForcePublish)
  const Status = Decision.Changed ? 'changed' : 'unchanged'

  await AppendWorkflowFile(Process.env.GITHUB_OUTPUT, `changed=${Decision.Changed}\n`)
  await AppendWorkflowFile(Process.env.GITHUB_STEP_SUMMARY, [
    '## Domain release check',
    '',
    `- Status: ${Status}`,
    `- Forced publish: ${ForcePublish}`,
    `- Previous normal domains: ${Previous.Counts.Normal}`,
    `- Current normal domains: ${Current.Counts.Normal}`,
    `- Current content hash: \`${Current.ContentHash}\``,
    ''
  ].join('\n'))

  console.log(`Domain collection is ${Status}: ${Current.ContentHash}`)
}

await CheckRelease()