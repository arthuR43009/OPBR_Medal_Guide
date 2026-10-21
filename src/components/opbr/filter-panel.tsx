'use client'

import { useMemo } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { FilterX } from 'lucide-react'
import { affectTypes, condOptions, persons, tagsByCategory, shortName } from '@/lib/opbr/data'
import type { FilterState } from '@/lib/opbr/types'

const TAG_CATEGORY_NAMES: Record<number, string> = {
  1: 'Story Arc / Location',
  2: 'Crew / Affiliation',
  3: 'Devil Fruit Type',
  4: 'Role',
  5: 'Race',
  6: 'Fighting Style',
  7: 'Title / Group',
  8: 'Family / Species',
  9: 'More Crews',
}

export function FilterPanel({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  onReset,
  counts,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  filters: FilterState
  onFiltersChange: (patch: Partial<FilterState>) => void
  onReset: () => void
  counts: { total: number; shown: number }
}) {
  const activeCount =
    filters.affectTypes.length +
    filters.condTypes.length +
    filters.tagIds.length +
    filters.personIds.length +
    (filters.onlyOwned ? 1 : 0) +
    (filters.onlyFavorite ? 1 : 0) +
    (filters.onlyEvent ? 1 : 0)

  const personOptions = useMemo(
    () => persons.filter(p => p.medalIds.length > 0).map(p => ({ id: p.id, name: p.name, n: p.medalIds.length })),
    [],
  )

  const toggle = (list: number[], id: number): number[] =>
    list.includes(id) ? list.filter(x => x !== id) : [...list, id]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="glass-strong opbr-scroll w-[min(400px,92vw)] overflow-y-auto p-0 text-[#e9edf6] sm:max-w-[400px]"
      >
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="flex items-center gap-2 font-display text-[15px] font-bold tracking-wide text-gold-bright">
            Filters
            <Badge className="bg-gradient-to-r from-gold-bright to-gold font-mono text-[10px] font-bold text-[#221807]">{counts.shown}/{counts.total}</Badge>
            {activeCount > 0 && (
              <button
                className="ml-auto flex items-center gap-1 rounded-lg border border-[#7a3040] bg-[#2a1520] px-2 py-1 text-[10px] font-semibold text-[#e8a0b0] transition-colors hover:border-[#ff5d6e]"
                onClick={onReset}
              >
                <FilterX className="h-3 w-3" /> Clear all ({activeCount})
              </button>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 p-4">
          {/* quick toggles */}
          <div className="flex flex-wrap gap-2">
            <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#2c3956] bg-[#151d30]/80 px-2.5 py-1.5 text-[11px] transition-colors hover:border-gold/50">
              <Checkbox
                checked={filters.onlyOwned}
                onCheckedChange={c => onFiltersChange({ onlyOwned: c === true })}
                className="h-3.5 w-3.5 border-[#3d4c6e] data-[state=checked]:border-gold data-[state=checked]:bg-gold"
              />
              Owned only
            </label>
            <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#2c3956] bg-[#151d30]/80 px-2.5 py-1.5 text-[11px] transition-colors hover:border-gold-bright/60">
              <Checkbox
                checked={filters.onlyFavorite}
                onCheckedChange={c => onFiltersChange({ onlyFavorite: c === true })}
                className="h-3.5 w-3.5 border-[#3d4c6e] data-[state=checked]:border-gold-bright data-[state=checked]:bg-gold-bright"
              />
              Favorite only
            </label>
            <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#2c3956] bg-[#151d30]/80 px-2.5 py-1.5 text-[11px] transition-colors hover:border-[#8f7bd4]">
              <Checkbox
                checked={filters.onlyEvent}
                onCheckedChange={c => onFiltersChange({ onlyEvent: c === true })}
                className="h-3.5 w-3.5 border-[#3d4c6e] data-[state=checked]:border-[#a78bfa] data-[state=checked]:bg-[#a78bfa]"
              />
              Event medals only
            </label>
          </div>

          <Accordion type="multiple" defaultValue={['effect', 'cond']} className="w-full">
            {/* Effect types */}
            <AccordionItem value="effect" className="border-[#2a3550]">
              <AccordionTrigger className="py-2 font-display text-[12px] font-bold text-gold hover:no-underline">
                Effect Type ({filters.affectTypes.length || ''})
              </AccordionTrigger>
              <AccordionContent className="grid grid-cols-2 gap-1.5">
                {affectTypes.map(at => (
                  <label
                    key={at.id}
                    className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#2a3550] bg-[#111a2c]/70 px-2 py-1 text-[10.5px] transition-colors hover:border-[#3a4a6e]"
                  >
                    <Checkbox
                      checked={filters.affectTypes.includes(at.id)}
                      onCheckedChange={() => onFiltersChange({ affectTypes: toggle(filters.affectTypes, at.id) })}
                      className="h-3 w-3 border-[#3d4c6e] data-[state=checked]:border-gold data-[state=checked]:bg-gold"
                    />
                    <span className="truncate" title={at.name}>{at.name}</span>
                  </label>
                ))}
              </AccordionContent>
            </AccordionItem>

            {/* Conditions */}
            <AccordionItem value="cond" className="border-[#2a3550]">
              <AccordionTrigger className="py-2 font-display text-[12px] font-bold text-gold hover:no-underline">
                Activation Condition ({filters.condTypes.length || ''})
              </AccordionTrigger>
              <AccordionContent className="opbr-scroll max-h-64 space-y-1 overflow-y-auto pr-1">
                {condOptions.map(c => (
                  <label
                    key={c.type}
                    className="flex cursor-pointer items-start gap-1.5 rounded-lg px-1.5 py-1 text-[10.5px] transition-colors hover:bg-white/5"
                  >
                    <Checkbox
                      checked={filters.condTypes.includes(c.type)}
                      onCheckedChange={() => onFiltersChange({ condTypes: toggle(filters.condTypes, c.type) })}
                      className="mt-0.5 h-3 w-3 border-[#3d4c6e] data-[state=checked]:border-gold data-[state=checked]:bg-gold"
                    />
                    <span className="leading-snug">{c.label}</span>
                  </label>
                ))}
              </AccordionContent>
            </AccordionItem>

            {/* Tags */}
            <AccordionItem value="tags" className="border-[#2a3550]">
              <AccordionTrigger className="py-2 font-display text-[12px] font-bold text-gold hover:no-underline">
                Medal Tags ({filters.tagIds.length || ''})
              </AccordionTrigger>
              <AccordionContent className="space-y-2">
                {Object.entries(TAG_CATEGORY_NAMES).map(([catId, catName]) => {
                  const list = tagsByCategory(Number(catId))
                  if (list.length === 0) return null
                  return (
                    <div key={catId}>
                      <div className="mb-1 font-display text-[9.5px] font-bold uppercase tracking-wider text-[#7e8aa3]">
                        {catName}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {list.map(t => {
                          const active = filters.tagIds.includes(t.id)
                          return (
                            <button
                              key={t.id}
                              onClick={() => onFiltersChange({ tagIds: toggle(filters.tagIds, t.id) })}
                              className={`tag-chip rounded-full border px-2 py-0.5 text-[10px] ${
                                active
                                  ? 'border-gold bg-gradient-to-r from-gold-bright to-gold font-semibold text-[#221807] shadow-[0_0_10px_-2px_rgba(240,181,69,0.5)]'
                                  : 'border-[#2c3956] bg-[#111a2c]/70 text-[#c3cde0] hover:border-gold/50 hover:text-gold-bright'
                              }`}
                            >
                              {t.name}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </AccordionContent>
            </AccordionItem>

            {/* Characters */}
            <AccordionItem value="char" className="border-[#2a3550]">
              <AccordionTrigger className="py-2 font-display text-[12px] font-bold text-gold hover:no-underline">
                Character ({filters.personIds.length || ''})
              </AccordionTrigger>
              <AccordionContent className="opbr-scroll max-h-64 overflow-y-auto pr-1">
                <div className="flex flex-wrap gap-1">
                  {personOptions.map(p => {
                    const active = filters.personIds.includes(p.id)
                    return (
                      <button
                        key={p.id}
                        onClick={() => onFiltersChange({ personIds: toggle(filters.personIds, p.id) })}
                        className={`tag-chip rounded-full border px-2 py-0.5 text-[10px] ${
                          active
                            ? 'border-gold bg-gradient-to-r from-gold-bright to-gold font-semibold text-[#221807] shadow-[0_0_10px_-2px_rgba(240,181,69,0.5)]'
                            : 'border-[#2c3956] bg-[#111a2c]/70 text-[#c3cde0] hover:border-gold/50 hover:text-gold-bright'
                        }`}
                        title={`${p.n} medals`}
                      >
                        {shortName(p.name)}
                      </button>
                    )
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </SheetContent>
    </Sheet>
  )
}
