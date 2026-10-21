'use client'

import { memo } from 'react'
import { Star, Check } from 'lucide-react'
import { medalImage, shortName } from '@/lib/opbr/data'
import type { Medal } from '@/lib/opbr/types'

interface MedalCardProps {
  medal: Medal
  selected?: boolean
  owned?: boolean
  favorite?: boolean
  compact?: boolean
  showName?: boolean
  /** staggered entrance delay in ms (capped by the grid) */
  entryDelay?: number
  onOpenDetail?: (medal: Medal) => void
  onSelect?: (medal: Medal) => void
  draggable?: boolean
  onDragStartMedal?: (e: React.DragEvent, medal: Medal) => void
}

export const MedalCard = memo(function MedalCard({
  medal,
  selected = false,
  owned = false,
  favorite = false,
  compact = false,
  showName = true,
  entryDelay = 0,
  onOpenDetail,
  onSelect,
  draggable = false,
  onDragStartMedal,
}: MedalCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={medal.name}
      draggable={draggable}
      onDragStart={e => onDragStartMedal?.(e, medal)}
      onClick={e => {
        if (e.altKey || e.metaKey || e.ctrlKey) {
          onOpenDetail?.(medal)
        } else if (onSelect) {
          onSelect(medal)
        } else {
          onOpenDetail?.(medal)
        }
      }}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          if (onSelect) onSelect(medal)
          else onOpenDetail?.(medal)
        }
      }}
      style={{ '--d': `${entryDelay}ms` } as React.CSSProperties}
      className={`medal-card group relative cursor-pointer select-none rounded-xl border p-1.5 ${
        selected
          ? 'is-selected border-gold'
          : 'border-[#26314a] hover:border-gold/45'
      } ${compact ? 'w-[76px]' : 'w-full'}`}
      title={medal.name}
    >
      {/* corner marks */}
      {favorite && (
        <span
          className="absolute right-0.5 top-0.5 z-10 text-gold-bright drop-shadow-[0_0_6px_rgba(240,181,69,0.8)] transition-transform duration-200 group-hover:scale-110"
          aria-label="Favorite"
        >
          <Star className="h-3.5 w-3.5 fill-gold-bright" />
        </span>
      )}
      {owned && (
        <span
          className="absolute left-0.5 top-0.5 z-10 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-val/60 bg-[#0d3d26] text-val shadow-[0_0_8px_rgba(61,220,151,0.45)]"
          aria-label="Owned"
        >
          <Check className="h-2.5 w-2.5" strokeWidth={4} />
        </span>
      )}
      {selected && (
        <span className="absolute bottom-0.5 left-1/2 z-10 -translate-x-1/2 rounded-full bg-gradient-to-r from-gold-bright to-gold px-1.5 font-mono text-[9px] font-bold text-[#221807] shadow-[0_0_10px_rgba(240,181,69,0.5)]">
          IN SET
        </span>
      )}

      <div className="relative aspect-square w-full overflow-hidden rounded-lg">
        <img
          src={medalImage(medal.id)}
          alt={medal.name}
          loading="lazy"
          draggable={false}
          className="h-full w-full object-contain drop-shadow-[0_3px_6px_rgba(0,0,0,0.65)] transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-110 group-hover:-rotate-2"
        />
      </div>

      {showName && !compact && (
        <div className="mt-1 truncate px-0.5 text-center text-[10px] font-medium leading-tight text-[#c3cde0] transition-colors group-hover:text-[#eef2fa]" title={medal.name}>
          {shortName(medal.name)}
        </div>
      )}
      {medal.isEvent && showName && !compact && (
        <div className="text-center font-mono text-[8px] font-semibold uppercase tracking-widest text-[#a78bfa]">
          Event
        </div>
      )}
    </div>
  )
})
