'use client'

// ─── App state: set slots, filters, marks, saved sets (persisted) ─────────────
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { FilterState, GroupMode, SavedSet } from '@/lib/opbr/types'

export type MarkMode = 'owned' | 'favorite'

interface OpbrState {
  /** the 3 medal set slots */
  slots: Array<number | null>
  /** group mode for the grid */
  groupMode: GroupMode
  /** filters */
  filters: FilterState
  /** marks */
  owned: number[]
  favorite: number[]
  /** saved sets */
  savedSets: SavedSet[]
  /** UI toggles */
  showOnlyMarked: boolean
  simplifyEffects: boolean

  // actions
  setSlot: (index: number, medalId: number | null) => void
  addToFirstEmptySlot: (medalId: number) => boolean
  clearSlots: () => void
  swapSlots: (a: number, b: number) => void
  setGroupMode: (mode: GroupMode) => void
  setFilters: (patch: Partial<FilterState>) => void
  resetFilters: () => void
  toggleMark: (medalId: number, mode: MarkMode) => void
  setMarks: (medalIds: number[], mode: MarkMode, value: boolean) => void
  toggleShowOnlyMarked: () => void
  toggleSimplifyEffects: () => void
  saveSet: (name: string) => SavedSet | null
  deleteSet: (id: string) => void
  loadSet: (id: string) => void
  updateSetName: (id: string, name: string) => void
}

const defaultFilters: FilterState = {
  search: '',
  affectTypes: [],
  condTypes: [],
  tagIds: [],
  personIds: [],
  onlyOwned: false,
  onlyFavorite: false,
  onlyEvent: false,
}

export const useOpbr = create<OpbrState>()(
  persist(
    (set, get) => ({
      slots: [null, null, null],
      groupMode: 'by-arc',
      filters: { ...defaultFilters },
      owned: [],
      favorite: [],
      savedSets: [],
      showOnlyMarked: false,
      simplifyEffects: false,

      setSlot: (index, medalId) =>
        set(s => {
          const slots = [...s.slots]
          if (medalId != null) {
            // if medal already in another slot, remove it there (move semantics)
            const existing = slots.indexOf(medalId)
            if (existing !== -1 && existing !== index) slots[existing] = null
          }
          slots[index] = medalId
          return { slots }
        }),

      addToFirstEmptySlot: medalId => {
        const { slots } = get()
        const idx = slots.indexOf(null)
        if (idx === -1) return false
        get().setSlot(idx, medalId)
        return true
      },

      clearSlots: () => set({ slots: [null, null, null] }),

      swapSlots: (a, b) =>
        set(s => {
          const slots = [...s.slots]
          ;[slots[a], slots[b]] = [slots[b], slots[a]]
          return { slots }
        }),

      setGroupMode: mode => set({ groupMode: mode }),

      setFilters: patch => set(s => ({ filters: { ...s.filters, ...patch } })),
      resetFilters: () => set({ filters: { ...defaultFilters } }),

      toggleMark: (medalId, mode) =>
        set(s => {
          const list = new Set(s[mode])
          if (list.has(medalId)) list.delete(medalId)
          else list.add(medalId)
          return { [mode]: [...list] } as Pick<OpbrState, typeof mode>
        }),

      setMarks: (medalIds, mode, value) =>
        set(s => {
          const list = new Set(s[mode])
          for (const id of medalIds) {
            if (value) list.add(id)
            else list.delete(id)
          }
          return { [mode]: [...list] } as Pick<OpbrState, typeof mode>
        }),

      toggleShowOnlyMarked: () => set(s => ({ showOnlyMarked: !s.showOnlyMarked })),
      toggleSimplifyEffects: () => set(s => ({ simplifyEffects: !s.simplifyEffects })),

      saveSet: name => {
        const { slots, savedSets } = get()
        const ids = slots.filter((x): x is number => x != null)
        if (ids.length === 0) return null
        const now = Date.now()
        const set0: SavedSet = {
          id: `set_${now}_${Math.random().toString(36).slice(2, 8)}`,
          name: name.trim() || `Set ${savedSets.length + 1}`,
          medalIds: [...slots],
          createdAt: now,
          updatedAt: now,
        }
        set({ savedSets: [set0, ...savedSets] })
        return set0
      },

      deleteSet: id => set(s => ({ savedSets: s.savedSets.filter(x => x.id !== id) })),

      loadSet: id => {
        const found = get().savedSets.find(x => x.id === id)
        if (!found) return
        const slots: Array<number | null> = [null, null, null]
        found.medalIds.slice(0, 3).forEach((mid, i) => { slots[i] = mid })
        set({ slots })
      },

      updateSetName: (id, name) =>
        set(s => ({
          savedSets: s.savedSets.map(x => (x.id === id ? { ...x, name, updatedAt: Date.now() } : x)),
        })),
    }),
    {
      name: 'opbr-builder-state',
      partialize: s => ({
        slots: s.slots,
        groupMode: s.groupMode,
        owned: s.owned,
        favorite: s.favorite,
        savedSets: s.savedSets,
        simplifyEffects: s.simplifyEffects,
      }),
    },
  ),
)
