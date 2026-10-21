// ─── OPBR Set Computation Engine ─────────────────────────────────────────────
// Replicates the original builder's rules:
//  1. Each medal contributes its Unique Trait (ability).
//  2. Tags shared by 2 medals -> set2 bonus; by all 3 -> set3 bonus.
//  3. Effects of the same affect category AND same condition merge with the
//     stacking rule: total = sum(params) - (count - 1).
//  4. Merged totals are capped per affect type (e.g. Skill-1 CD boost max 30%).
//     limit -> param conversion: param = limit/100 + 1 (30 -> 1.3, -30 -> 0.7)

import {
  abilityById, affectTypeToCategory, categoryById, limitByAffectType, medalById, medals, tagById,
} from './data'
import type { MergedEffect, SetComputation, TagCount } from './types'

/** limit number (like 30 / -30) -> param space (1.3 / 0.7) */
function limitToParam(limit: number): number {
  return parseFloat((limit / 100 + 1).toFixed(2))
}

/** percentage delta of a param (1.2 -> "+20%", 0.9 -> "-10%") */
export function paramToPercent(param: number): string {
  const d = (param - 1) * 100
  const rounded = Math.round(d * 100) / 100
  return (rounded > 0 ? '+' : '') + parseFloat(rounded.toFixed(2)) + '%'
}

/** substitute the first percentage in the detail text with the merged value */
function syncDetail(detail: string, oldParam: number | null, newParam: number): string {
  if (oldParam == null) return detail
  const oldPct = paramToPercent(oldParam).replace('+', '')
  const newPct = paramToPercent(newParam).replace('+', '')
  const re = new RegExp(`([+\\-]?\\s?)${oldPct.replace(/%/g, '%')}`)
  if (!detail.match(re)) return detail
  return detail.replace(re, `$1${newPct}`)
}

interface Contribution {
  from: string
  abilityId: number
}

export function computeSet(medalIds: Array<number | null>): SetComputation {
  const selected = medalIds
    .filter((x): x is number => x != null)
    .map(id => medalById.get(id))
    .filter((m): m is NonNullable<typeof m> => Boolean(m))

  // ── 1. unique traits ──────────────────────────────────────────────────────
  const contribs: Contribution[] = selected.map(m => ({
    from: m.name.replace(/ Medal$/i, ''),
    abilityId: m.abilityId,
  }))

  // ── 2. tag counting & set bonuses ─────────────────────────────────────────
  const tagCounts = new Map<number, number>()
  for (const m of selected) {
    for (const tid of m.tagIds) {
      tagCounts.set(tid, (tagCounts.get(tid) ?? 0) + 1)
    }
  }
  const tagInfo: TagCount[] = [...tagCounts.entries()]
    .map(([tid, count]) => {
      const tag = tagById.get(tid)!
      return {
        tag,
        count,
        set2Ability: tag.set2 ? abilityById.get(tag.set2) ?? null : null,
        set3Ability: tag.set3 ? abilityById.get(tag.set3) ?? null : null,
      }
    })
    .sort((a, b) => b.count - a.count || a.tag.sortId - b.tag.sortId)

  const activeTagBonuses: SetComputation['activeTagBonuses'] = []
  for (const tc of tagInfo) {
    if (tc.count >= 3 && tc.set3Ability) {
      contribs.push({ from: `${tc.tag.name} ×3`, abilityId: tc.set3Ability.id })
      activeTagBonuses.push({ tag: tc.tag, count: 3, ability: tc.set3Ability, level: 3 })
    } else if (tc.count >= 2 && tc.set2Ability) {
      contribs.push({ from: `${tc.tag.name} ×2`, abilityId: tc.set2Ability.id })
      activeTagBonuses.push({ tag: tc.tag, count: 2, ability: tc.set2Ability, level: 2 })
    }
  }

  // ── 3. group by (category, condType) and merge ────────────────────────────
  const groups = new Map<string, MergedEffect>()
  const groupFirstAbility = new Map<string, number>() // key -> ability id of first contributor

  for (const c of contribs) {
    const ab = abilityById.get(c.abilityId)
    if (!ab) continue
    const categoryId = affectTypeToCategory.get(ab.affectType) ?? ab.affectType
    const key = `${categoryId}|${ab.condType ?? -1}`
    if (!groupFirstAbility.has(key)) groupFirstAbility.set(key, ab.id)
    let g = groups.get(key)
    if (!g) {
      const cat = categoryById.get(categoryId)
      g = {
        categoryId,
        categoryName: cat?.name ?? `Type ${ab.affectType}`,
        condType: ab.condType,
        sources: [],
        mergedParam: null,
        cappedParam: null,
        limitMsg: null,
        reachLimit: false,
        displayDetail: '',
        valuePercent: null,
        limitPercent: null,
        isReduction: false,
      }
      groups.set(key, g)
    }
    g.sources.push({ from: c.from, detail: ab.detail, param: ab.param1 })
  }

  const effects: MergedEffect[] = []
  for (const [key, g] of groups.entries()) {
    const params = g.sources.map(s => s.param).filter((p): p is number => p != null)
    let merged: number | null = null
    if (params.length > 0) {
      merged = params.length === 1
        ? params[0]
        : parseFloat((params.reduce((a, b) => a + b, 0) - (params.length - 1)).toFixed(2))
    }
    g.mergedParam = merged

    // ── 4. limits: keyed by the RAW affect type of the first contributing ability
    let capped: number | null = merged
    let reachLimit = false
    let limitPercent: number | null = null
    if (merged != null) {
      const firstAb = abilityById.get(groupFirstAbility.get(key)!)
      if (firstAb) {
        const lim = limitByAffectType.get(firstAb.affectType)
        if (lim) {
          limitPercent = Math.abs(lim.limit)
          const limitParam = limitToParam(lim.limit)
          if (lim.limit < 0) {
            // reduction: param must not drop BELOW limitParam
            if (merged <= limitParam) {
              reachLimit = true
              capped = limitParam
            }
          } else {
            // boost: param must not exceed limitParam
            if (merged >= limitParam) {
              reachLimit = true
              capped = limitParam
            }
          }
          g.limitMsg = lim.msg
        }
      }
    }
    g.cappedParam = capped
    g.reachLimit = reachLimit
    g.limitPercent = limitPercent

    // ── 5. progress-display percentages (positive numbers, rounded to 2 decimals)
    const effParam = capped ?? merged
    if (effParam != null) {
      const delta = (effParam - 1) * 100
      g.isReduction = delta < -1e-9
      g.valuePercent = parseFloat(Math.abs(Math.round(delta * 100) / 100).toFixed(2))
    }

    const base = g.sources[0]?.detail ?? ''
    g.displayDetail = merged != null
      ? syncDetail(base, g.sources[0]?.param ?? null, capped ?? merged)
      : base
    if (reachLimit) g.displayDetail += '  (MAX)'
    effects.push(g)
  }

  // sort: unconditional first, then by category name
  effects.sort((a, b) => {
    if (a.condType == null && b.condType != null) return -1
    if (a.condType != null && b.condType == null) return 1
    return a.categoryName.localeCompare(b.categoryName)
  })

  return { medals: selected, effects, tags: tagInfo, activeTagBonuses }
}

/**
 * Suggest replacement medals: medals sharing the most tags with the current
 * set (excluding already-selected ones). Returns top N.
 */
export function suggestReplacements(
  medalIds: Array<number | null>,
  ownedFilter: Set<number> | null,
  topN = 24,
): Array<{ medalId: number; sharedTags: number[] }> {
  const selectedTagIds = new Set<number>()
  const selected = new Set<number>(medalIds.filter((x): x is number => x != null))
  for (const mid of selected) {
    const m = medalById.get(mid)
    if (m) for (const t of m.tagIds) selectedTagIds.add(t)
  }
  const scored: Array<{ medalId: number; sharedTags: number[] }> = []
  for (const m of medals) {
    if (selected.has(m.id)) continue
    if (ownedFilter && ownedFilter.size > 0 && !ownedFilter.has(m.id)) continue
    const shared = m.tagIds.filter(t => selectedTagIds.has(t))
    if (shared.length >= 3) scored.push({ medalId: m.id, sharedTags: shared })
  }
  scored.sort((a, b) => b.sharedTags.length - a.sharedTags.length)
  return scored.slice(0, topN)
}
