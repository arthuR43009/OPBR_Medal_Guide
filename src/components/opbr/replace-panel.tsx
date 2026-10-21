'use client'

import { useMemo, useState } from 'react'
import { Sparkles, Copy } from 'lucide-react'
import { suggestReplacements } from '@/lib/opbr/engine'
import { medalById, tagById } from '@/lib/opbr/data'
import { MedalCard } from './medal-card'
import type { Medal } from '@/lib/opbr/types'
import { useToast } from '@/hooks/use-toast'

export function ReplacePanel({
  slots,
  ownedSet,
  selectedMedalIds,
  onSelect,
  onOpenDetail,
}: {
  slots: Array<number | null>
  ownedSet: Set<number>
  selectedMedalIds: number[]
  onSelect?: (m: Medal) => void
  onOpenDetail?: (m: Medal) => void
}) {
  const [limit, setLimit] = useState(24)
  const { toast } = useToast()
  const suggestions = useMemo(
    () => suggestReplacements(slots, ownedSet.size > 0 ? ownedSet : null, limit),
    [slots, ownedSet, limit],
  )

  const copyIds = () => {
    const ids = slots.filter((x): x is number => x != null).join(', ')
    navigator.clipboard.writeText(ids).then(
      () => toast({ title: 'Medal IDs copied', description: ids }),
      () => toast({ title: 'Copy failed', variant: 'destructive' }),
    )
  }

  return (
    <div className="flex h-full flex-col p-2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[10px] leading-snug text-[#8d99b3]">
          Medals sharing 3+ tags with your current set — good candidates to swap in.
        </p>
        <div className="flex shrink-0 gap-1">
          <button
            className="flex items-center gap-1 rounded-lg border border-[#2c3956] bg-[#151d30]/80 px-2 py-1 text-[10px] font-semibold text-[#dfe6f2] transition-colors hover:border-gold/50 hover:text-gold-bright"
            onClick={() => setLimit(l => (l === 24 ? 60 : 24))}
            title="Show more / fewer"
          >
            <Sparkles className="h-3 w-3" />
            {limit === 24 ? 'More' : 'Fewer'}
          </button>
          <button
            className="flex items-center gap-1 rounded-lg border border-[#2c3956] bg-[#151d30]/80 px-2 py-1 text-[10px] font-semibold text-[#dfe6f2] transition-colors hover:border-gold/50 hover:text-gold-bright"
            onClick={copyIds}
            title="Copy current set medal IDs"
          >
            <Copy className="h-3 w-3" />
            ID
          </button>
        </div>
      </div>

      {suggestions.length === 0 ? (
        <div className="fade-up flex flex-1 items-center justify-center p-6 text-center text-[11px] text-[#8d99b3]">
          {slots.every(x => x == null)
            ? 'Build a set first, then suggestions will appear here.'
            : 'No replacement candidates found (need 3+ shared tags).'}
        </div>
      ) : (
        <div className="opbr-scroll grid flex-1 grid-cols-[repeat(auto-fill,minmax(84px,1fr))] content-start gap-1.5 overflow-y-auto">
          {suggestions.map(({ medalId, sharedTags }) => {
            const m = medalById.get(medalId)
            if (!m) return null
            return (
              <div key={medalId} className="relative">
                <MedalCard
                  medal={m}
                  selected={selectedMedalIds.includes(medalId)}
                  onOpenDetail={onOpenDetail}
                  onSelect={onSelect}
                />
                <span
                  className="pointer-events-none absolute bottom-0.5 right-0.5 z-10 rounded-md bg-val/90 px-1 font-mono text-[9px] font-bold text-[#052e1d] shadow-[0_0_8px_rgba(61,220,151,0.4)]"
                  title={`Shares: ${sharedTags.map(t => tagById.get(t)?.name).filter(Boolean).join(', ')}`}
                >
                  {sharedTags.length}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
