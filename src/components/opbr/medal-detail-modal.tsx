'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Star, Check, Coins } from 'lucide-react'
import { abilityById, medalImage, personByMedalId, shortName, tagById } from '@/lib/opbr/data'
import type { Medal } from '@/lib/opbr/types'

/** highlight percentages inside a detail line */
function Val({ text }: { text: string }) {
  const parts = text.split(/([+-]?\d+(?:\.\d+)?%)/g)
  return (
    <>
      {parts.map((p, i) =>
        /^\d/.test(p) || /^[+-]\d/.test(p) ? (
          <span key={i} className="font-mono font-bold text-val">{p}</span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  )
}

export function MedalDetailModal({
  medal,
  owned,
  favorite,
  onToggleOwned,
  onToggleFavorite,
  onAddToSet,
  onClose,
}: {
  medal: Medal | null
  owned: boolean
  favorite: boolean
  onToggleOwned: () => void
  onToggleFavorite: () => void
  onAddToSet: (m: Medal) => void
  onClose: () => void
}) {
  if (!medal) return null
  const ability = abilityById.get(medal.abilityId)
  const person = personByMedalId.get(medal.id)

  return (
    <Dialog open={!!medal} onOpenChange={o => !o && onClose()}>
      <DialogContent aria-describedby={undefined} className="glass-strong w-[min(440px,92vw)] border-[#2c3956] text-[#e9edf6]">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center gap-3">
            <div className="relative h-20 w-20 shrink-0 rounded-xl border border-[#2c3956] bg-[#0e1626] p-1 shadow-[0_0_18px_-6px_rgba(240,181,69,0.35)]">
              <img
                src={medalImage(medal.id)}
                alt={medal.name}
                className="h-full w-full object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)]"
              />
            </div>
            <div className="min-w-0">
              <DialogTitle className="truncate font-display text-[15px] font-bold tracking-wide text-gold-bright">{medal.name}</DialogTitle>
              <div className="mt-0.5 text-[11px] text-[#8d99b3]">
                {person ? `Character: ${person.name}` : 'Character: —'} · <span className="font-mono">ID {medal.id}</span>
                {medal.isEvent && (
                  <span className="ml-1.5 rounded bg-[#2a2450] px-1.5 py-px font-mono text-[9px] font-semibold uppercase tracking-wide text-[#b3a7f7]">
                    Event
                  </span>
                )}
              </div>
              <div className="mt-1.5 flex gap-1.5">
                <button
                  onClick={onToggleFavorite}
                  className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold transition-all duration-200 ${
                    favorite
                      ? 'border-gold-bright/70 bg-gold/15 text-gold-bright shadow-[0_0_10px_-2px_rgba(255,217,122,0.4)]'
                      : 'border-[#2c3956] bg-[#151d30]/80 text-[#8d99b3] hover:border-gold-bright/60'
                  }`}
                >
                  <Star className={`h-3 w-3 ${favorite ? 'fill-gold-bright' : ''}`} />
                  Favorite
                </button>
                <button
                  onClick={onToggleOwned}
                  className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold transition-all duration-200 ${
                    owned
                      ? 'border-val/60 bg-val/10 text-val shadow-[0_0_10px_-2px_rgba(61,220,151,0.4)]'
                      : 'border-[#2c3956] bg-[#151d30]/80 text-[#8d99b3] hover:border-val/60'
                  }`}
                >
                  <Check className="h-3 w-3" strokeWidth={3} />
                  Owned
                </button>
                <button
                  onClick={() => onAddToSet(medal)}
                  className="btn-gold flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold text-[#221807]"
                >
                  <Coins className="h-3 w-3" />
                  Add to set
                </button>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          {/* unique trait */}
          <div className="rounded-xl border border-[#2a3550] bg-[#0e1626]/70 p-2.5">
            <div className="mb-1 flex items-center gap-1.5 font-display text-[10px] font-bold uppercase tracking-wider text-gold">
              Unique Trait
            </div>
            <p className="text-[12px] leading-snug text-[#dfe6f2]">
              <Val text={ability?.detail ?? '—'} />
            </p>
            {ability?.param1 != null && (
              <p className="mt-1 font-mono text-[10px] text-[#7e8aa3]">
                Type: {ability.affectType} · Condition: {ability.condType ?? 'None'}
              </p>
            )}
          </div>

          {/* tags */}
          <div className="rounded-xl border border-[#2a3550] bg-[#0e1626]/70 p-2.5">
            <div className="mb-1.5 flex items-center gap-1.5 font-display text-[10px] font-bold uppercase tracking-wider text-gold">
              Tags <span className="font-mono text-[#8d99b3]">({medal.tagIds.length})</span>
            </div>
            <div className="space-y-1.5">
              {medal.tagIds.map(tid => {
                const t = tagById.get(tid)
                if (!t) return null
                const s2 = t.set2 ? abilityById.get(t.set2) : null
                const s3 = t.set3 ? abilityById.get(t.set3) : null
                return (
                  <details key={tid} className="group rounded-lg border border-[#2a3550] bg-[#111a2c]/70 px-2 py-1.5 transition-colors hover:border-[#3a4a6e]">
                    <summary className="flex cursor-pointer list-none items-center justify-between text-[11px] font-medium text-[#dfe6f2] transition-colors hover:text-gold-bright">
                      <span>{t.name}</span>
                      <span className="font-mono text-[9px] text-[#7e8aa3] group-open:hidden">set bonuses ▾</span>
                      <span className="hidden font-mono text-[9px] text-[#7e8aa3] group-open:inline">▴</span>
                    </summary>
                    <div className="mt-1.5 space-y-1 border-l border-gold/25 pl-2">
                      <div className="text-[10px] leading-snug text-[#c3cde0]">
                        <span className="mr-1 rounded bg-gold/25 px-1.5 py-px font-mono text-[9px] font-bold text-gold-bright">×2</span>
                        <Val text={s2?.detail ?? 'No bonus'} />
                      </div>
                      <div className="text-[10px] leading-snug text-[#c3cde0]">
                        <span className="mr-1 rounded bg-gradient-to-r from-gold-bright to-gold px-1.5 py-px font-mono text-[9px] font-bold text-[#221807]">×3</span>
                        <Val text={s3?.detail ?? 'No bonus'} />
                      </div>
                    </div>
                  </details>
                )
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
