// ─── OPBR Game Data Types ────────────────────────────────────────────────────

export interface Medal {
  id: number
  name: string
  abilityId: number
  tagIds: number[]
  isEvent: boolean
  type: number
}

export interface MedalTag {
  id: number
  name: string
  category: number
  sortId: number
  set2: number | null
  set3: number | null
}

export interface Ability {
  id: number
  affectType: number
  condType: number | null
  detail: string
  param1: number | null
}

export interface AffectType {
  id: number
  name: string
  typeIds: number[]
}

export interface AffectLimit {
  affectType: number
  limit: number
  msg: string
  customStack: boolean
}

export interface Person {
  id: number
  name: string
  names: string[]
  alias: string[]
  medalIds: number[]
}

export interface GameData {
  medals: Medal[]
  tags: MedalTag[]
  abilities: Ability[]
  affectTypes: AffectType[]
  limits: AffectLimit[]
  persons: Person[]
}

// ─── Engine output types ─────────────────────────────────────────────────────

/** One merged effect line shown in the Effects tab */
export interface MergedEffect {
  categoryId: number
  categoryName: string
  condType: number | null
  /** individual contributing abilities (for tooltips) */
  sources: {
    from: string // medal name or "Tag bonus (x2)" label
    detail: string
    param: number | null
  }[]
  /** merged parameter after stacking rule (sum - (n-1)) */
  mergedParam: number | null
  /** capped parameter if a limit applies */
  cappedParam: number | null
  limitMsg: string | null
  reachLimit: boolean
  /** the display text with the merged value substituted */
  displayDetail: string
  /** current total as a positive percentage (e.g. 20 for +20%) — for progress display */
  valuePercent: number | null
  /** cap as a positive percentage (e.g. 30) — null when no limit applies */
  limitPercent: number | null
  /** true for reduction effects (values shown as -X%) */
  isReduction: boolean
}

/** Tag with how many selected medals carry it */
export interface TagCount {
  tag: MedalTag
  count: number
  /** set bonus ability when count >= 2 */
  set2Ability: Ability | null
  set3Ability: Ability | null
}

export interface SetComputation {
  medals: Medal[]
  effects: MergedEffect[]
  tags: TagCount[]
  activeTagBonuses: { tag: MedalTag; count: number; ability: Ability; level: 2 | 3 }[]
}

export type GroupMode = 'no-category' | 'by-arc' | 'by-pirate-navy' | 'by-character'

export interface SavedSet {
  id: string
  name: string
  /** The 3 builder slots, in order; null = empty slot. */
  medalIds: Array<number | null>
  createdAt: number
  updatedAt: number
}

export interface FilterState {
  search: string
  /** affect type ids (category ids) */
  affectTypes: number[]
  /** condition types */
  condTypes: number[]
  /** tag ids */
  tagIds: number[]
  /** person ids */
  personIds: number[]
  onlyOwned: boolean
  onlyFavorite: boolean
  onlyEvent: boolean
}
