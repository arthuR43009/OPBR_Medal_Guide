'use client'

import { useMemo, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Menu, Bookmark, Settings as SettingsIcon, Funnel, Search, X, CheckCheck,
  Star, Check, Save, Eraser, Info, Coins, Sparkles, Languages,
} from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { MedalCard } from '@/components/opbr/medal-card'
import { EffectsPanel } from '@/components/opbr/effects-panel'
import { TagsPanel } from '@/components/opbr/tags-panel'
import { ReplacePanel } from '@/components/opbr/replace-panel'
import { FilterPanel } from '@/components/opbr/filter-panel'
import { MedalDetailModal } from '@/components/opbr/medal-detail-modal'
import { SavedSetsPanel } from '@/components/opbr/saved-sets-panel'
import { useOpbr } from '@/lib/opbr/store'
import { computeSet } from '@/lib/opbr/engine'
import {
  affectTypeToCategory, abilityById, medalById, medalImage, medals, personByMedalId,
  searchMedals, shortName, tagsByCategory, persons,
} from '@/lib/opbr/data'
import type { GroupMode, Medal } from '@/lib/opbr/types'
import { useToast } from '@/hooks/use-toast'
import { useHydrated } from '@/hooks/use-hydrated'

const GROUP_MODES: { id: GroupMode; label: string }[] = [
  { id: 'no-category', label: 'No Category' },
  { id: 'by-arc', label: 'By Arc' },
  { id: 'by-pirate-navy', label: 'By Pirate & Navy' },
  { id: 'by-character', label: 'By Character' },
]

export default function Home() {
  const hydrated = useHydrated()
  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0e18]">
        <div className="fade-up text-center">
          <div className="loader-ring mx-auto mb-4 h-11 w-11 rounded-full border-[3px] border-transparent border-t-gold border-r-gold-bright border-b-gold-deep" />
          <p className="font-display text-[14px] font-semibold tracking-wide text-[#8d99b3]">
            Loading <span className="gold-text font-bold">Medal Set Builder</span>…
          </p>
        </div>
      </div>
    )
  }
  return <BuilderApp />
}

function BuilderApp() {
  const { toast } = useToast()
  const s = useOpbr()
  const mounted = useHydrated()
  const [detailMedal, setDetailMedal] = useState<Medal | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [savedOpen, setSavedOpen] = useState(false)
  const [introOpen, setIntroOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [tab, setTab] = useState<'effects' | 'tags' | 'replace'>('effects')
  const [batchMode, setBatchMode] = useState(false)
  const [batchSelected, setBatchSelected] = useState<Set<number>>(new Set())
  const [saveName, setSaveName] = useState('')
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null)

  // first visit -> show intro (deferred callback reads localStorage; no sync setState in effect body)
  useEffect(() => {
    let cancelled = false
    const t = setTimeout(() => {
      if (cancelled) return
      try {
        if (!localStorage.getItem('opbr-intro-seen')) {
          localStorage.setItem('opbr-intro-seen', '1')
          setIntroOpen(true)
        }
      } catch { /* ignore */ }
    }, 300)
    return () => { cancelled = true; clearTimeout(t) }
  }, [])

  const ownedSet = useMemo(() => new Set(mounted ? s.owned : []), [mounted, s.owned])
  const favoriteSet = useMemo(() => new Set(mounted ? s.favorite : []), [mounted, s.favorite])
  const selectedMedalIds = useMemo(
    () => s.slots.filter((x): x is number => x != null),
    [s.slots],
  )

  const computation = useMemo(() => computeSet(s.slots), [s.slots])

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const f = s.filters
    let list = s.filters.search ? searchMedals(f.search) : medals.slice()

    if (f.affectTypes.length > 0) {
      list = list.filter(m => {
        const ab = abilityById.get(m.abilityId)
        if (!ab) return false
        const cat = affectTypeToCategory.get(ab.affectType) ?? ab.affectType
        return f.affectTypes.includes(cat)
      })
    }
    if (f.condTypes.length > 0) {
      list = list.filter(m => {
        const ab = abilityById.get(m.abilityId)
        if (!ab) return false
        const ct = ab.condType ?? -1
        return f.condTypes.includes(ct)
      })
    }
    if (f.tagIds.length > 0) {
      list = list.filter(m => m.tagIds.some(t => f.tagIds.includes(t)))
    }
    if (f.personIds.length > 0) {
      list = list.filter(m => {
        const p = personByMedalId.get(m.id)
        return p ? f.personIds.includes(p.id) : false
      })
    }
    if (f.onlyEvent) list = list.filter(m => m.isEvent)
    if (mounted && f.onlyOwned) list = list.filter(m => ownedSet.has(m.id))
    if (mounted && f.onlyFavorite) list = list.filter(m => favoriteSet.has(m.id))
    if (mounted && s.showOnlyMarked) {
      list = list.filter(m => ownedSet.has(m.id) || favoriteSet.has(m.id))
    }
    return list
  }, [s.filters, mounted, ownedSet, favoriteSet, s.showOnlyMarked])

  // ── Grouping ───────────────────────────────────────────────────────────────
  const sections = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => b.id - a.id)
    if (s.groupMode === 'no-category') {
      return [{ name: '', medals: sorted }]
    }
    if (s.groupMode === 'by-character') {
      const map = new Map<string, typeof sorted>()
      const others: typeof sorted = []
      for (const m of sorted) {
        const p = personByMedalId.get(m.id)
        if (p) {
          const key = p.name
          if (!map.has(key)) map.set(key, [])
          map.get(key)!.push(m)
        } else others.push(m)
      }
      const out = [...map.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([name, ms]) => ({ name, medals: ms }))
      if (others.length) out.push({ name: 'Others', medals: others })
      return out
    }
    // by tag category (1 = arc, 2 = crew)
    const cat = s.groupMode === 'by-arc' ? 1 : 2
    const catTags = tagsByCategory(cat).slice().sort((a, b) => a.sortId - b.sortId)
    let pool = sorted
    const out: { name: string; medals: typeof sorted }[] = []
    for (const t of catTags) {
      const inSection = pool.filter(m => m.tagIds.includes(t.id))
      if (inSection.length === 0) continue
      out.push({ name: t.name, medals: inSection })
      const remove = new Set(inSection.map(m => m.id))
      pool = pool.filter(m => !remove.has(m.id))
    }
    if (pool.length) out.push({ name: 'Others', medals: pool })
    return out
  }, [filtered, s.groupMode])

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleGridClick = (m: Medal) => {
    if (batchMode) {
      setBatchSelected(prev => {
        const next = new Set(prev)
        if (next.has(m.id)) next.delete(m.id)
        else next.add(m.id)
        return next
      })
      return
    }
    const added = s.addToFirstEmptySlot(m.id)
    if (!added) {
      toast({ title: 'All slots filled', description: 'Remove a medal or open details (Alt+Click).' })
    }
  }

  const handleDragStart = (e: React.DragEvent, m: Medal) => {
    e.dataTransfer.setData('application/x-medal-id', String(m.id))
    e.dataTransfer.effectAllowed = 'copyMove'
  }

  const handleDropOnSlot = (e: React.DragEvent, slotIndex: number) => {
    e.preventDefault()
    setDragOverSlot(null)
    const id = Number(e.dataTransfer.getData('application/x-medal-id'))
    if (medalById.has(id)) s.setSlot(slotIndex, id)
  }

  const doSave = () => {
    if (selectedMedalIds.length === 0) {
      toast({ title: 'Nothing to save', description: 'Add at least one medal to the set.', variant: 'destructive' })
      return
    }
    const saved = s.saveSet(saveName)
    if (saved) {
      setSaveName('')
      toast({ title: 'Set saved', description: `"${saved.name}" added to your saved sets.` })
    }
  }

  const batchMark = (mode: 'owned' | 'favorite', value: boolean) => {
    s.setMarks([...batchSelected], mode, value)
    toast({
      title: `${batchSelected.size} medals ${value ? 'marked' : 'unmarked'}`,
      description: value ? `Added to your ${mode} list.` : `Removed from your ${mode} list.`,
    })
    setBatchSelected(new Set())
    setBatchMode(false)
  }

  const activeFilterCount =
    s.filters.affectTypes.length + s.filters.condTypes.length + s.filters.tagIds.length +
    s.filters.personIds.length + (s.filters.onlyOwned ? 1 : 0) + (s.filters.onlyFavorite ? 1 : 0) +
    (s.filters.onlyEvent ? 1 : 0)

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0e18]">
        <div className="fade-up text-center">
          <div className="loader-ring mx-auto mb-4 h-11 w-11 rounded-full border-[3px] border-transparent border-t-gold border-r-gold-bright border-b-gold-deep" />
          <p className="font-display text-[14px] font-semibold tracking-wide text-[#8d99b3]">
            Loading <span className="gold-text font-bold">Medal Set Builder</span>…
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-transparent text-[#e9edf6]">
      {/* ══ Ambient aurora background ══ */}
      <div className="app-bg" aria-hidden="true">
        <div className="aurora aurora-gold" />
        <div className="aurora aurora-teal" />
        <div className="aurora aurora-indigo" />
        <div className="bg-noise" />
        <div className="bg-vignette" />
      </div>

      {/* ══ Navbar ══ */}
      <header className="glass flex h-12 shrink-0 items-center gap-2 border-b px-3">
        <button
          className="rounded p-1.5 text-[#8d99b3] hover:bg-white/5 hover:text-gold-bright"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="gold-text hidden truncate font-display text-[16px] font-bold tracking-wide sm:block">
          OPBR — Medal Set Builder
        </h1>
        <h1 className="gold-text font-display text-[16px] font-bold tracking-wide sm:hidden">Medal Set Builder</h1>

        <div className="ml-auto flex items-center gap-1">
          <button
            className="relative rounded p-1.5 text-[#8d99b3] hover:bg-white/5 hover:text-gold-bright"
            onClick={() => setSavedOpen(true)}
            aria-label="Saved sets"
            title="Saved sets"
          >
            <Bookmark className="h-5 w-5" />
            {s.savedSets.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 min-w-[16px] rounded-full bg-gradient-to-r from-gold-bright to-gold px-1 text-center text-[9px] font-bold leading-4 text-[#221807] shadow-[0_0_10px_rgba(240,181,69,0.4)]">
                {s.savedSets.length}
              </span>
            )}
          </button>
          <button
            className="rounded p-1.5 text-[#8d99b3] hover:bg-white/5 hover:text-gold-bright"
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
            title="Settings"
          >
            <SettingsIcon className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* ══ Main two-panel layout ══ */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* ── LEFT PANEL ── */}
        <aside className="glass-strong flex w-full shrink-0 flex-col border-b lg:w-[400px] lg:border-b-0 lg:border-r">
          {/* set zone */}
          <div className="shrink-0 border-b border-[#2a3550]/70 bg-[#0e1626]/50 p-3">
            <div className="flex items-center gap-3">
              <div className="flex flex-1 gap-2">
                {s.slots.map((slotId, i) => {
                  const m = slotId != null ? medalById.get(slotId) : null
                  return (
                    <div
                      key={i}
                      role="button"
                      tabIndex={0}
                      aria-label={`Medal slot ${i + 1}`}
                      onClick={() => m && setDetailMedal(m)}
                      onDragOver={e => { e.preventDefault(); setDragOverSlot(i) }}
                      onDragLeave={() => setDragOverSlot(null)}
                      onDrop={e => handleDropOnSlot(e, i)}
                      className={`relative aspect-square w-[calc((100%-1rem)/3)] max-w-[92px] flex-1 cursor-pointer rounded-xl border-2 border-dashed transition-all duration-200 ${
                        dragOverSlot === i
                          ? 'slot-drop-active border-gold bg-[#2e2517]'
                          : m
                            ? 'slot-ring-filled border-val/55 bg-[#12261c]/60'
                            : 'border-[#2c3956] bg-[#0d1322]/70 hover:border-[#3d4c6e]'
                      }`}
                    >
                      {m ? (
                        <>
                          <motion.div
                            key={m.id}
                            initial={{ scale: 0.35, opacity: 0, rotate: -10 }}
                            animate={{ scale: 1, opacity: 1, rotate: 0 }}
                            transition={{ type: 'spring', stiffness: 320, damping: 16 }}
                            className="h-full w-full"
                          >
                            <img
                              src={medalImage(m.id)}
                              alt={m.name}
                              draggable={false}
                              className="h-full w-full object-contain p-1 drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]"
                            />
                          </motion.div>
                          <button
                            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-[#7a3040] bg-[#2a1520] text-[12px] font-bold leading-none text-[#ff9aa8] transition-all duration-200 hover:scale-110 hover:bg-[#3a1c2a]"
                            onClick={e => { e.stopPropagation(); s.setSlot(i, null) }}
                            aria-label={`Remove ${m.name}`}
                          >
                            ×
                          </button>
                          <span className="absolute bottom-0.5 left-1/2 w-[85%] -translate-x-1/2 truncate rounded bg-black/60 px-1 text-center text-[8px] font-medium leading-tight text-[#ffe9b8]">
                            {shortName(m.name)}
                          </span>
                        </>
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-1 text-[#5a6a8a]">
                          <Coins className="slot-empty-icon h-5 w-5" />
                          <span className="font-mono text-[9px]">Slot {i + 1}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* save row */}
            <div className="mt-2.5 flex gap-2">
              <input
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && doSave()}
                placeholder="Set name..."
                className="min-w-0 flex-1 rounded-lg border border-[#2c3956] bg-[#0d1322]/80 px-2.5 py-1.5 text-[11px] text-[#e9edf6] placeholder-[#5a6680] transition-all focus:border-gold focus:shadow-[0_0_0_3px_rgba(240,181,69,0.15)] focus:outline-none"
              />
              <button
                onClick={doSave}
                className="btn-ocean flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-1.5 font-display text-[11px] font-bold text-white"
              >
                <Save className="h-3.5 w-3.5" /> Save
              </button>
              <button
                onClick={() => { s.clearSlots(); toast({ title: 'Set cleared' }) }}
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[#2c3956] bg-[#151d30]/80 px-3 py-1.5 text-[11px] text-[#a9b4ca] transition-all duration-200 hover:scale-105 hover:border-[#ff5d6e] hover:text-[#ff9aa8]"
                title="Clear all slots"
              >
                <Eraser className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* tabs */}
          <div className="relative flex shrink-0 border-b" role="tablist">
            {([
              ['effects', 'Effects'],
              ['tags', `Tags${computation.activeTagBonuses.length ? ` (${computation.activeTagBonuses.length})` : ''}`],
              ['replace', 'Replacement'],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`relative flex-1 px-2 py-2.5 font-display text-[11.5px] font-semibold tracking-wide transition-colors ${
                  tab === id
                    ? 'text-gold-bright'
                    : 'text-[#7e8aa3] hover:text-[#c3cde0]'
                }`}
              >
                {label}
                {tab === id && (
                  <motion.span
                    layoutId="opbr-tab-indicator"
                    className="absolute inset-x-3 bottom-0 h-[2.5px] rounded-full bg-gradient-to-r from-gold-bright via-gold to-gold-deep shadow-[0_0_10px_rgba(240,181,69,0.55)]"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* tab content */}
          <div className="opbr-scroll min-h-0 flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
              >
                {tab === 'effects' && <EffectsPanel effects={computation.effects} simplifyMode={s.simplifyEffects} />}
                {tab === 'tags' && (
                  <TagsPanel tagCounts={computation.tags} selectedMedalIds={selectedMedalIds} onOpenDetail={setDetailMedal} />
                )}
                {tab === 'replace' && (
                  <ReplacePanel
                    slots={s.slots}
                    ownedSet={ownedSet}
                    selectedMedalIds={selectedMedalIds}
                    onSelect={handleGridClick}
                    onOpenDetail={setDetailMedal}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </aside>

        {/* ── RIGHT PANEL ── */}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-transparent">
          {/* function bar */}
          <div className="glass flex shrink-0 flex-wrap items-center gap-2 border-b px-3 py-2">
            <button
              className={`relative flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] ${
                activeFilterCount > 0
                  ? 'border-gold/60 bg-gold/10 text-gold-bright shadow-[0_0_12px_-2px_rgba(240,181,69,0.35)]'
                  : 'border-[#2c3956] bg-[#151d30]/80 text-[#c3cde0] hover:border-gold/50 hover:text-gold-bright'
              }`}
              onClick={() => setFilterOpen(true)}
            >
              <Funnel className="h-3.5 w-3.5" />
              Filters
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-gradient-to-r from-gold-bright to-gold px-1.5 text-[9px] font-bold text-[#221807]">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <div className="relative min-w-0 flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#5a6680]" />
              <input
                value={s.filters.search}
                onChange={e => s.setFilters({ search: e.target.value })}
                placeholder="Search by name / character..."
                className="w-full rounded-lg border border-[#2c3956] bg-[#0d1322]/80 py-1.5 pl-8 pr-7 text-[11px] text-[#e9edf6] placeholder-[#5a6680] transition-all focus:border-gold focus:shadow-[0_0_0_3px_rgba(240,181,69,0.15)] focus:outline-none"
                aria-label="Search medals"
              />
              {s.filters.search && (
                <button
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-[#8d99b3] transition-colors hover:bg-white/10 hover:text-white"
                  onClick={() => s.setFilters({ search: '' })}
                  aria-label="Clear search"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            <div className="ml-auto flex items-center gap-1.5">
              {/* show only marked */}
              <button
                className={`rounded-md border p-1.5 ${
                  s.showOnlyMarked
                    ? 'border-gold-bright bg-gold/15 text-gold-bright shadow-[0_0_12px_-2px_rgba(255,217,122,0.45)]'
                    : 'border-[#2c3956] bg-[#151d30]/80 text-[#8d99b3] hover:border-gold-bright'
                }`}
                onClick={s.toggleShowOnlyMarked}
                title="Show only owned / favorite medals"
                aria-label="Show only marked medals"
              >
                <Star className="h-4 w-4" />
              </button>

              {/* group mode */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 rounded-lg border border-[#2c3956] bg-[#151d30]/80 px-2.5 py-1.5 font-display text-[11px] font-semibold text-[#c3cde0] transition-colors hover:border-gold/50 hover:text-gold-bright">
                    <Languages className="hidden h-3.5 w-3.5 sm:block" />
                    {GROUP_MODES.find(g => g.id === s.groupMode)?.label ?? 'Group'}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="glass-strong border-[#2c3956] text-[#e9edf6]" align="end">
                  <DropdownMenuLabel className="text-[10px] text-[#7e8aa3]">Group medals into sections</DropdownMenuLabel>
                  {GROUP_MODES.map(g => (
                    <button
                      key={g.id}
                      className={`flex w-full items-center justify-between px-2 py-1.5 text-left text-[12px] transition-colors hover:bg-white/5 ${
                        s.groupMode === g.id ? 'font-semibold text-gold-bright' : 'text-[#c3cde0]'
                      }`}
                      onClick={() => s.setGroupMode(g.id)}
                    >
                      {g.label}
                      {s.groupMode === g.id && <Check className="h-3.5 w-3.5" />}
                    </button>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* batch mode */}
              <button
                className={`rounded-md border p-1.5 ${
                  batchMode
                    ? 'border-gold/60 bg-gold/10 text-gold-bright shadow-[0_0_12px_-2px_rgba(240,181,69,0.35)]'
                    : 'border-[#2c3956] bg-[#151d30]/80 text-[#8d99b3] hover:border-gold/50'
                }`}
                onClick={() => { setBatchMode(b => !b); setBatchSelected(new Set()) }}
                title="Batch select medals for marking"
                aria-label="Batch select mode"
              >
                <CheckCheck className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* batch bar */}
          <AnimatePresence>
            {batchMode && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="shrink-0 overflow-hidden"
              >
                <div className="flex flex-wrap items-center gap-2 border-b border-gold/30 bg-gold/[0.07] px-3 py-2 backdrop-blur-md">
                  <span className="font-display text-[11px] font-bold text-gold-bright">
                    Batch mode — click medals to select ({batchSelected.size})
                  </span>
              <button
                className="rounded-lg border border-[#2c3956] bg-[#151d30]/80 px-2 py-1 text-[10px] text-[#c3cde0] transition-colors hover:border-gold/50 hover:text-gold-bright"
                onClick={() => setBatchSelected(new Set(filtered.map(m => m.id)))}
              >
                Select all
              </button>
              <button
                className="rounded-lg border border-[#2c3956] bg-[#151d30]/80 px-2 py-1 text-[10px] text-[#c3cde0] transition-colors hover:border-gold/50 hover:text-gold-bright"
                onClick={() => setBatchSelected(new Set())}
              >
                Deselect all
              </button>
              <div className="ml-auto flex gap-1.5">
                <button
                  disabled={batchSelected.size === 0}
                  className="flex items-center gap-1 rounded-lg border border-val/50 bg-val/10 px-2 py-1 text-[10px] text-val transition-colors hover:bg-val/20 disabled:opacity-40"
                  onClick={() => batchMark('owned', true)}
                >
                  <Check className="h-3 w-3" strokeWidth={3} /> Mark owned
                </button>
                <button
                  disabled={batchSelected.size === 0}
                  className="flex items-center gap-1 rounded-lg border border-gold-bright/60 bg-gold/10 px-2 py-1 text-[10px] text-gold-bright transition-colors hover:bg-gold/20 disabled:opacity-40"
                  onClick={() => batchMark('favorite', true)}
                >
                  <Star className="h-3 w-3" /> Mark favorite
                </button>
                <button
                  disabled={batchSelected.size === 0}
                  className="rounded-lg border border-[#7a3040] bg-[#221520]/80 px-2 py-1 text-[10px] text-[#d9909a] transition-colors hover:bg-[#2a1a28] disabled:opacity-40"
                  onClick={() => { s.setMarks([...batchSelected], 'owned', false); s.setMarks([...batchSelected], 'favorite', false); setBatchSelected(new Set()); setBatchMode(false) }}
                >
                  Unmark all
                </button>
                </div>
              </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* medal grid */}
          <div className="opbr-scroll min-h-0 flex-1 overflow-y-auto p-3">
            {sections.length === 0 ? (
              <div className="fade-up flex h-full flex-col items-center justify-center gap-2 text-[#8d99b3]">
                <Search className="h-10 w-10 opacity-30" />
                <p className="font-display text-[13px] font-semibold">No medals match your filters.</p>
                <button
                  className="rounded-lg border border-[#2c3956] px-3 py-1.5 text-[11px] text-[#c3cde0] transition-colors hover:border-gold/50 hover:text-gold-bright"
                  onClick={s.resetFilters}
                >
                  Clear filters
                </button>
              </div>
            ) : (
              sections.map((sec, si) => (
                <section key={sec.name + si} className="mb-4" aria-label={sec.name || 'Medals'}>
                  {sec.name && (
                    <div className="sticky top-0 z-10 -mx-1 mb-2 flex items-center gap-2 bg-[#0a0e18]/90 px-1 py-1 backdrop-blur-md">
                      <span className="section-bar h-3.5 w-1 rounded-full" />
                      <h2 className="font-display text-[12.5px] font-bold uppercase tracking-wider text-gold-bright">{sec.name}</h2>
                      <span className="rounded-full bg-[#1c2537] px-1.5 font-mono text-[9px] text-[#8d99b3]">{sec.medals.length}</span>
                      <span className="h-px flex-1 bg-gradient-to-r from-[#2a3550] to-transparent" />
                    </div>
                  )}
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(78px,1fr))] gap-1.5">
                    {sec.medals.map((m, mi) => (
                      <MedalCard
                        key={m.id}
                        medal={m}
                        entryDelay={Math.min(mi, 14) * 35}
                        selected={selectedMedalIds.includes(m.id)}
                        owned={ownedSet.has(m.id)}
                        favorite={favoriteSet.has(m.id)}
                        onSelect={handleGridClick}
                        onOpenDetail={setDetailMedal}
                        draggable
                        onDragStartMedal={handleDragStart}
                      />
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>
        </main>
      </div>

      {/* ══ Overlays ══ */}
      <FilterPanel
        open={filterOpen}
        onOpenChange={setFilterOpen}
        filters={s.filters}
        onFiltersChange={s.setFilters}
        onReset={s.resetFilters}
        counts={{ total: medals.length, shown: filtered.length }}
      />

      <SavedSetsPanel
        open={savedOpen}
        onOpenChange={setSavedOpen}
        savedSets={s.savedSets}
        onLoad={s.loadSet}
        onDelete={s.deleteSet}
        onRename={s.updateSetName}
        currentSlots={s.slots}
      />

      <MedalDetailModal
        medal={detailMedal}
        owned={detailMedal ? ownedSet.has(detailMedal.id) : false}
        favorite={detailMedal ? favoriteSet.has(detailMedal.id) : false}
        onToggleOwned={() => detailMedal && s.toggleMark(detailMedal.id, 'owned')}
        onToggleFavorite={() => detailMedal && s.toggleMark(detailMedal.id, 'favorite')}
        onAddToSet={m => { s.addToFirstEmptySlot(m.id); setDetailMedal(null) }}
        onClose={() => setDetailMedal(null)}
      />

      {/* menu sheet */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="glass-strong w-[280px] p-0 text-[#e9edf6] sm:max-w-[280px]">
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle className="gold-text font-display text-[16px] font-bold tracking-wide">OPBR Medal Set Builder</SheetTitle>
          </SheetHeader>
          <div className="p-2">
            <MenuGroup title="About">
              <MenuItem icon={<Info className="h-4 w-4" />} label="Introduction" onClick={() => { setMenuOpen(false); setIntroOpen(true) }} />
            </MenuGroup>
            <MenuGroup title="Features">
              <MenuItem icon={<Sparkles className="h-4 w-4" />} label="Saved Sets" onClick={() => { setMenuOpen(false); setSavedOpen(true) }} />
              <MenuItem icon={<Funnel className="h-4 w-4" />} label="Filters" onClick={() => { setMenuOpen(false); setFilterOpen(true) }} />
              <MenuItem icon={<CheckCheck className="h-4 w-4" />} label="Batch Marking" onClick={() => { setMenuOpen(false); setBatchMode(true) }} />
            </MenuGroup>
            <div className="mt-4 rounded-xl border border-[#2a3550] bg-[#111a2c]/70 p-3 text-[10px] leading-relaxed text-[#8d99b3]">
              <p className="mb-1 font-display font-bold text-gold-bright">Disclaimer</p>
              <p>Fan-made tool for ONE PIECE Bounty Rush players. Not affiliated with Bandai Namco. All game assets belong to their respective owners.</p>
            </div>
            <div className="mt-3 flex items-center justify-center gap-1.5 font-mono text-[10px] text-[#5a6680]">
              <Coins className="h-3 w-3" />
              <span>{medals.length} medals · {persons.length} characters</span>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* intro modal */}
      <Dialog open={introOpen} onOpenChange={setIntroOpen}>
        <DialogContent aria-describedby={undefined} className="glass-strong w-[min(520px,92vw)] border-[#2c3956] text-[#e9edf6]">
          <DialogHeader>
            <DialogTitle className="font-display text-[17px] font-bold tracking-wide text-gold-bright">Welcome to the Medal Set Builder</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-[12px] leading-relaxed text-[#c3cde0]">
            <p>
              A fan-made tool for <strong className="text-gold-bright">ONE PIECE Bounty Rush</strong> players.
              Build medal sets, check combined effects, stack tag bonuses, and find the best combos.
            </p>
            <ul className="space-y-1.5">
              <li className="flex gap-2"><span className="font-bold text-gold">•</span> Click a medal to add it to your set (up to 3). Drag & drop works too.</li>
              <li className="flex gap-2"><span className="font-bold text-gold">•</span> <strong>Effects tab</strong> merges everything with the game&apos;s real stacking rules and caps.</li>
              <li className="flex gap-2"><span className="font-bold text-gold">•</span> <strong>Tags tab</strong> shows 2/3-tag set bonuses in progress.</li>
              <li className="flex gap-2"><span className="font-bold text-gold">•</span> Filter by effect, condition, tag or character. Search by medal or character name.</li>
              <li className="flex gap-2"><span className="font-bold text-gold">•</span> Mark medals as owned/favorite; save your sets — all stored locally in your browser.</li>
              <li className="flex gap-2"><span className="font-bold text-gold">•</span> Alt+Click a medal to open full details.</li>
            </ul>
            <p className="text-[10px] text-[#7e8aa3]">
              Disclaimer: fan-made tool, not affiliated with Bandai Namco Entertainment. Game data and assets belong to their respective owners.
            </p>
          </div>
          <button
            className="btn-gold w-full rounded-xl py-2.5 font-display text-[13px] font-bold text-[#221807]"
            onClick={() => setIntroOpen(false)}
          >
            Start building
          </button>
        </DialogContent>
      </Dialog>

      {/* settings modal */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent aria-describedby={undefined} className="glass-strong w-[min(420px,92vw)] border-[#2c3956] text-[#e9edf6]">
          <DialogHeader>
            <DialogTitle className="font-display text-[15px] font-bold tracking-wide text-gold-bright">Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-[#2a3550] bg-[#0e1626]/70 p-3">
              <div>
                <div className="text-[12px] font-semibold text-[#dfe6f2]">Trim mode</div>
                <div className="text-[10px] text-[#7e8aa3]">Simplify effects: hide &quot;When …&quot; condition prefixes</div>
              </div>
              <Switch
                checked={s.simplifyEffects}
                onCheckedChange={s.toggleSimplifyEffects}
                className="data-[state=checked]:bg-gold"
              />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-[#2a3550] bg-[#0e1626]/70 p-3">
              <div>
                <div className="text-[12px] font-semibold text-[#dfe6f2]">Marked medals only</div>
                <div className="text-[10px] text-[#7e8aa3]">Show only owned / favorite medals in the grid</div>
              </div>
              <Switch
                checked={s.showOnlyMarked}
                onCheckedChange={s.toggleShowOnlyMarked}
                className="data-[state=checked]:bg-gold"
              />
            </div>
            <div className="rounded-xl border border-[#2a3550] bg-[#0e1626]/70 p-3">
              <div className="mb-2 text-[12px] font-semibold text-[#dfe6f2]">Your data</div>
              <div className="flex gap-2">
                <button
                  className="flex-1 rounded-lg border border-[#2c3956] bg-[#151d30]/80 px-2 py-1.5 text-[11px] text-[#c3cde0] transition-colors hover:border-gold/50 hover:text-gold-bright"
                  onClick={() => {
                    const dump = JSON.stringify({
                      owned: s.owned, favorite: s.favorite, savedSets: s.savedSets, slots: s.slots,
                    }, null, 2)
                    const blob = new Blob([dump], { type: 'application/json' })
                    const a = document.createElement('a')
                    a.href = URL.createObjectURL(blob)
                    a.download = 'opbr-builder-data.json'
                    a.click()
                    URL.revokeObjectURL(a.href)
                    toast({ title: 'Data exported' })
                  }}
                >
                  Export (owned / favorites / sets)
                </button>
              </div>
              <div className="mt-1.5 font-mono text-[10px] leading-snug text-[#7e8aa3]">
                {s.owned.length} owned · {s.favorite.length} favorites · {s.savedSets.length} saved sets stored in this browser
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function MenuGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="px-2 py-1 font-display text-[9.5px] font-bold uppercase tracking-widest text-[#5a6680]">{title}</div>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

function MenuItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-[12.5px] text-[#c3cde0] transition-colors hover:bg-white/5 hover:text-gold-bright"
      onClick={onClick}
    >
      <span className="text-gold">{icon}</span>
      {label}
    </button>
  )
}
