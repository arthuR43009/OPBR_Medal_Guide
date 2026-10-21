// ─── OPBR data access layer: loads game-data.json and builds indexes ─────────
import rawData from './data/game-data.json'
import type {
  Ability, AffectLimit, AffectType, GameData, Medal, MedalTag, Person,
} from './types'

const data = rawData as unknown as GameData

// ── Indexes ──────────────────────────────────────────────────────────────────
export const medals: Medal[] = data.medals
export const tags: MedalTag[] = data.tags
export const abilities: Ability[] = data.abilities
export const affectTypes: AffectType[] = data.affectTypes
export const limits: AffectLimit[] = data.limits
export const persons: Person[] = data.persons

export const medalById = new Map<number, Medal>(medals.map(m => [m.id, m]))
export const tagById = new Map<number, MedalTag>(tags.map(t => [t.id, t]))
export const abilityById = new Map<number, Ability>(abilities.map(a => [a.id, a]))
export const limitByAffectType = new Map<number, AffectLimit>(limits.map(l => [l.affectType, l]))

/** affectType (raw) -> category id (medal_affect_type.id) */
export const affectTypeToCategory = new Map<number, number>()
for (const at of affectTypes) {
  for (const tid of at.typeIds) affectTypeToCategory.set(tid, at.id)
}
export const categoryById = new Map<number, AffectType>(affectTypes.map(a => [a.id, a]))

/** person lookup: medal id -> person */
export const personByMedalId = new Map<number, Person>()
for (const p of persons) {
  for (const mid of p.medalIds) {
    if (!personByMedalId.has(mid)) personByMedalId.set(mid, p)
  }
}

export const tagsByCategory = (category: number) => tags.filter(t => t.category === category)

/** condition type -> human label (derived from ability details prefix "When ...:") */
export function condLabel(condType: number | null): string {
  if (condType == null) return 'No condition (always active)'
  const ab = abilities.find(a => a.condType === condType)
  if (!ab) return `Condition #${condType}`
  const m = ab.detail.match(/^(When[^:]*|For[^:]*|After[^:]*|On[^:]*):/)
  return m ? m[1] : ab.detail.split(':')[0] ?? `Condition #${condType}`
}

/** distinct condition types with labels, sorted */
export const condOptions: { type: number; label: string }[] = (() => {
  const seen = new Map<number, string>()
  for (const a of abilities) {
    if (a.condType == null) continue
    if (!seen.has(a.condType)) {
      const m = a.detail.match(/^(When[^:]*|For[^:]*|After[^:]*):/)
      seen.set(a.condType, m ? m[1] : `Condition #${a.condType}`)
    }
  }
  // also include null as -1 for "always"
  const list = [...seen.entries()]
    .map(([type, label]) => ({ type, label }))
    .sort((a, b) => a.label.localeCompare(b.label))
  list.unshift({ type: -1, label: 'No condition (always active)' })
  return list
})()

export function medalImage(id: number): string {
  return `/img/medals/img_icon_medal_${id}.webp`
}

/** character/medal name search */
export function searchMedals(query: string, pool?: Medal[]): Medal[] {
  const q = query.trim().toLowerCase()
  const src = pool ?? medals
  if (!q) return src
  // match persons first
  const matchedMedalIds = new Set<number>()
  for (const p of persons) {
    const haystack = [p.name, ...p.names, ...p.alias].join(' ').toLowerCase()
    if (haystack.includes(q)) {
      for (const mid of p.medalIds) matchedMedalIds.add(mid)
    }
  }
  return src.filter(m => {
    if (m.name.toLowerCase().includes(q)) return true
    if (matchedMedalIds.has(m.id)) return true
    const person = personByMedalId.get(m.id)
    if (person && person.name.toLowerCase().includes(q)) return true
    return false
  })
}

/** display name without the " Medal" suffix */
export function shortName(name: string): string {
  return name.replace(/ Medal$/i, '')
}
