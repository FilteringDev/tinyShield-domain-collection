import { Full } from './domain-data.js'

const Domains = [...(Full as unknown as readonly string[])]

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

function BinarySearch(Candidate: string): boolean {
  let Left = 0
  let Right = Domains.length - 1

  while (Left <= Right) {
    const Middle = Math.floor((Left + Right) / 2)
    const Comparison = CompareCodePoints(Domains[Middle], Candidate)

    if (Comparison === 0) return true
    if (Comparison < 0) Left = Middle + 1
    else Right = Middle - 1
  }

  return false
}

export function getDomainsList(): string[] {
  return [...Domains]
}

export function isAllowedToRun(Url: URL): boolean {
  let Hostname = Url.hostname.toLowerCase()
  if (Hostname.endsWith('.')) Hostname = Hostname.slice(0, -1)
  if (Hostname.length === 0) return false

  const Parts = Hostname.split('.')
  for (let Index = 0; Index < Parts.length; Index += 1) {
    const Candidate = Parts.slice(Index).join('.')
    if (BinarySearch(Candidate)) return true
  }

  return false
}