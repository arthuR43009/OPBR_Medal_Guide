'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { medalById, medalImage, shortName, searchMedals } from '@/lib/opbr/data'
import type { SavedSet } from '@/lib/opbr/types'
import { Trash2, Upload, Search, ArrowDownAZ } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export function SavedSetsPanel({
  open,
  onOpenChange,
  savedSets,
  onLoad,
  onDelete,
  onRename,
  currentSlots,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  savedSets: SavedSet[]
  onLoad: (id: string) => void
  onDelete: (id: string) => void
  onRename: (id: string, name: string) => void
  currentSlots: Array<number | null>
}) {
  const [query, setQuery] = useState('')
  const [sortMode, setSortMode] = useState<'new' | 'name'>('new')
  const { toast } = useToast()

  const filtered = useMemo(() => {
    let list = [...savedSets]
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter(s => {
        if (s.name.toLowerCase().includes(q)) return true
        return s.medalIds.some(mid => {
          const m = mid != null ? medalById.get(mid) : undefined
          return m ? m.name.toLowerCase().includes(q) : false
        })
      })
    }
    if (sortMode === 'name') list.sort((a, b) => a.name.localeCompare(b.name))
    else list.sort((a, b) => b.updatedAt - a.updatedAt)
    return list
  }, [savedSets, query, sortMode])

  const isCurrent = (s: SavedSet) =>
    s.medalIds.length === currentSlots.length &&
    s.medalIds.every((mid, i) => currentSlots[i] === mid)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="glass-strong opbr-scroll w-[min(380px,92vw)] overflow-y-auto p-0 text-[#e9edf6] sm:max-w-[380px]"
      >
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="flex items-center gap-2 font-display text-[15px] font-bold tracking-wide text-gold-bright">
            Saved Sets
            <span className="rounded-full bg-gradient-to-r from-gold-bright to-gold px-2 py-px font-mono text-[10px] font-bold text-[#221807] shadow-[0_0_10px_rgba(240,181,69,0.35)]">
              {savedSets.length}
            </span>
          </SheetTitle>
          <div className="mt-1 flex items-center gap-1.5">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#5a6680]" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search sets or medals..."
                className="w-full rounded-lg border border-[#2c3956] bg-[#0d1322]/80 py-1.5 pl-7 pr-2 text-[11px] text-[#e9edf6] placeholder-[#5a6680] transition-all focus:border-gold focus:shadow-[0_0_0_3px_rgba(240,181,69,0.15)] focus:outline-none"
              />
            </div>
            <button
              className="rounded-lg border border-[#2c3956] bg-[#151d30]/80 p-1.5 text-[#8d99b3] transition-colors hover:border-gold/50 hover:text-gold-bright"
              title={sortMode === 'new' ? 'Sort by name' : 'Sort by recent'}
              onClick={() => setSortMode(m => (m === 'new' ? 'name' : 'new'))}
            >
              <ArrowDownAZ className="h-3.5 w-3.5" />
            </button>
          </div>
        </SheetHeader>

        <div className="space-y-2 p-3">
          {filtered.length === 0 && (
            <div className="fade-up p-6 text-center text-[11px] leading-relaxed text-[#8d99b3]">
              {savedSets.length === 0
                ? 'No saved sets yet. Build a set and press Save.'
                : 'No sets match your search.'}
            </div>
          )}
          {filtered.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28, delay: i * 0.04 }}
              className={`rounded-xl border p-2 backdrop-blur-sm transition-colors ${
                isCurrent(s)
                  ? 'border-gold/60 bg-gold/[0.08] shadow-[0_0_16px_-6px_rgba(240,181,69,0.4)]'
                  : 'border-[#2a3550] bg-[#111a2c]/70 hover:border-[#3a4a6e]'
              }`}
            >
              <div className="mb-1.5 flex items-center gap-1.5">
                <input
                  defaultValue={s.name}
                  onBlur={e => {
                    const v = e.target.value.trim()
                    if (v && v !== s.name) onRename(s.id, v)
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                  }}
                  className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 font-display text-[12px] font-semibold text-gold-bright transition-colors hover:border-[#2c3956] focus:border-gold focus:bg-[#0d1322] focus:outline-none"
                  title="Click to rename"
                />
                <button
                  className="rounded-lg p-1 text-[#8d99b3] transition-colors hover:bg-white/5 hover:text-gold-bright"
                  title="Load this set"
                  onClick={() => {
                    onLoad(s.id)
                    toast({ title: 'Set loaded', description: `"${s.name}" is now in the builder` })
                  }}
                >
                  <Upload className="h-3.5 w-3.5" />
                </button>
                <button
                  className="rounded-lg p-1 text-[#8d99b3] transition-colors hover:bg-[#3a1c2a] hover:text-[#ff9aa8]"
                  title="Delete"
                  onClick={() => onDelete(s.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                {s.medalIds.map((mid, i) => {
                  const m = mid != null ? medalById.get(mid) : undefined
                  return (
                    <div key={i} className="relative h-12 w-12 rounded-lg border border-[#2a3550] bg-[#0d1322] p-0.5 transition-transform duration-200 hover:scale-105">
                      {m ? (
                        <img
                          src={medalImage(m.id)}
                          alt={m.name}
                          className="h-full w-full object-contain"
                          title={shortName(m.name)}
                        />
                      ) : (
                        <span className="flex h-full items-center justify-center font-mono text-[9px] text-[#4a5878]">—</span>
                      )}
                    </div>
                  )
                })}
                <span className="ml-auto font-mono text-[9px] text-[#5a6680]">
                  {new Date(s.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}
