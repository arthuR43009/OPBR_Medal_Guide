'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { TagCount } from '@/lib/opbr/types'
import { medals, tagById } from '@/lib/opbr/data'
import { MedalCard } from './medal-card'
import type { Medal } from '@/lib/opbr/types'

export function TagsPanel({
  tagCounts,
  selectedMedalIds,
  onOpenDetail,
}: {
  tagCounts: TagCount[]
  selectedMedalIds: number[]
  onOpenDetail?: (m: Medal) => void
}) {
  const [detailTagId, setDetailTagId] = useState<number | null>(null)

  if (tagCounts.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-[#8d99b3]"
      >
        <p className="max-w-[220px] text-[12px] leading-relaxed">Tag bonuses appear when 2 or 3 selected medals share the same tag.</p>
      </motion.div>
    )
  }

  const tag = detailTagId != null ? tagById.get(detailTagId) : null
  const tagMedals: Medal[] = tag ? medals.filter(m => m.tagIds.includes(tag.id)) : []

  return (
    <>
      <div className="space-y-1.5 p-2" aria-label="Medal tags">
        {tagCounts.map((tc, i) => (
          <motion.div
            key={tc.tag.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28, delay: i * 0.04 }}
            className={`tag-chip flex items-center gap-2 rounded-xl border px-2.5 py-1.5 backdrop-blur-sm ${
              tc.count >= 2
                ? 'border-gold/40 bg-gold/[0.08] shadow-[inset_0_0_16px_rgba(240,181,69,0.05)]'
                : 'border-[#2a3550] bg-[#111a2c]/70'
            }`}
          >
            {/* progress: x/3 */}
            <div className="flex shrink-0 gap-1" aria-label={`${tc.count} of 3`}>
              {[1, 2, 3].map(i => (
                <motion.span
                  key={i}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 20, delay: 0.15 + i * 0.06 }}
                  className={`h-2 w-2 rounded-full transition-colors ${
                    i <= tc.count
                      ? 'bg-gradient-to-br from-gold-bright to-gold shadow-[0_0_6px_rgba(240,181,69,0.6)]'
                      : 'bg-[#2c3956]'
                  }`}
                />
              ))}
            </div>
            <button
              className="min-w-0 flex-1 truncate text-left text-[11px] font-medium text-[#dfe6f2] transition-colors hover:text-gold-bright"
              onClick={() => setDetailTagId(tc.tag.id)}
              title={`${tc.tag.name} — click for details`}
            >
              {tc.tag.name}
            </button>
            <span
              className={`shrink-0 rounded-md px-1.5 py-px font-mono text-[10px] font-bold ${
                tc.count >= 3
                  ? 'bg-gradient-to-r from-gold-bright to-gold text-[#221807] shadow-[0_0_8px_rgba(240,181,69,0.4)]'
                  : tc.count === 2
                    ? 'bg-gold/25 text-gold-bright'
                    : 'bg-[#1c2537] text-[#8d99b3]'
              }`}
            >
              ×{tc.count}
            </span>
          </motion.div>
        ))}

        {/* active set bonuses summary */}
        {tagCounts.some(t => t.count >= 2) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.35 }}
            className="mt-2 rounded-xl border border-[#2a3550] bg-[#0e1626]/70 p-2"
          >
            <div className="mb-1 font-display text-[10px] font-bold uppercase tracking-wider text-gold">
              Active set bonuses
            </div>
            <ul className="space-y-1">
              {tagCounts
                .filter(t => t.count >= 2)
                .map(t => (
                  <li key={t.tag.id} className="text-[10px] leading-snug text-[#c3cde0]">
                    <span className="font-semibold text-gold-bright">{t.tag.name} ×{t.count}:</span>{' '}
                    {(t.count >= 3 ? t.set3Ability?.detail : t.set2Ability?.detail) ?? '—'}
                  </li>
                ))}
            </ul>
          </motion.div>
        )}
      </div>

      {/* Tag detail modal */}
      <Dialog open={detailTagId != null} onOpenChange={o => !o && setDetailTagId(null)}>
        <DialogContent aria-describedby={undefined} className="glass-strong max-h-[85vh] w-[min(560px,92vw)] overflow-hidden border-[#2c3956] p-0 text-[#e9edf6]">
          <DialogHeader className="border-b px-4 py-3">
            <DialogTitle className="font-display text-[15px] font-bold tracking-wide text-gold-bright">{tag?.name ?? ''}</DialogTitle>
          </DialogHeader>
          <div className="opbr-scroll max-h-[70vh] overflow-y-auto p-4">
            {tag && (
              <>
                <div className="mb-3 space-y-1 rounded-xl border border-[#2a3550] bg-[#0e1626]/70 p-2.5 text-[11px]">
                  <div className="font-display font-bold text-gold">Set bonuses</div>
                  <div className="text-[#c3cde0]">
                    <span className="mr-1 rounded bg-gold/25 px-1.5 py-px font-mono text-[9px] font-bold text-gold-bright">×2</span>
                    {tagCounts.find(t => t.tag.id === tag.id)?.set2Ability?.detail ?? 'No bonus'}
                  </div>
                  <div className="text-[#c3cde0]">
                    <span className="mr-1 rounded bg-gradient-to-r from-gold-bright to-gold px-1.5 py-px font-mono text-[9px] font-bold text-[#221807]">×3</span>
                    {tagCounts.find(t => t.tag.id === tag.id)?.set3Ability?.detail ?? 'No bonus'}
                  </div>
                </div>
                <div className="mb-1.5 font-display text-[11px] font-bold text-gold">
                  Medals with this tag <span className="font-mono text-[#8d99b3]">({tagMedals.length})</span>
                </div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(84px,1fr))] gap-1.5">
                  {tagMedals.map(m => (
                    <MedalCard
                      key={m.id}
                      medal={m}
                      selected={selectedMedalIds.includes(m.id)}
                      onOpenDetail={onOpenDetail}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
