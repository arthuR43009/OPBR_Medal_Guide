'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Info, Zap } from 'lucide-react'
import type { MergedEffect } from '@/lib/opbr/types'
import { condLabel } from '@/lib/opbr/data'

/** Simplify a detail line: strip "When <cond>:" prefix */
function simplify(detail: string): string {
  return detail.replace(/^(When[^:]*|For[^:]*|After[^:]*):\s*/i, '')
}

/** Render detail text with percentages highlighted in green mono bold */
function HighlightedText({ text }: { text: string }) {
  const parts = text.split(/([+-]?\d+(?:\.\d+)?%)/g)
  return (
    <>
      {parts.map((p, i) =>
        /^\d/.test(p) || /^[+-]\d/.test(p) ? (
          <span key={i} className="font-mono font-bold text-val">
            {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  )
}

/** Spring count-up for stat values */
function useCountUp(target: number, duration = 620): number {
  const [v, setV] = useState(0)
  const raf = useRef<number | null>(null)
  useEffect(() => {
    const start = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration)
      const e = 1 - Math.pow(1 - p, 3) // ease-out cubic
      setV(target * e)
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [target, duration])
  return v
}

function fmt(n: number): string {
  return parseFloat(n.toFixed(1)).toString()
}

const rowVariants = {
  hidden: { opacity: 0, y: 14, scale: 0.97 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 380, damping: 28, delay: i * 0.045 },
  }),
}

function EffectRow({ fx, i, simplifyMode }: { fx: MergedEffect; i: number; simplifyMode: boolean }) {
  const [open, setOpen] = useState(false)
  const text = simplifyMode ? simplify(fx.displayDetail) : fx.displayDetail
  const cond = fx.condType != null ? condLabel(fx.condType) : null

  const hasProgress = fx.limitPercent != null && fx.valuePercent != null
  const ratio = hasProgress
    ? Math.min(1, Math.max(0.04, (fx.valuePercent ?? 0) / (fx.limitPercent ?? 1)))
    : 0
  const countUp = useCountUp(fx.valuePercent ?? 0)
  const sign = fx.isReduction ? '-' : '+'

  return (
    <motion.li
      custom={i}
      variants={rowVariants}
      initial="hidden"
      animate="show"
      layout
      className={`rounded-xl border px-2.5 py-2 text-[11px] leading-snug backdrop-blur-sm transition-colors ${
        fx.reachLimit
          ? 'border-val/35 bg-[#0e2418]/80 shadow-[inset_0_0_18px_rgba(61,220,151,0.06)]'
          : 'border-[#2a3550] bg-[#111a2c]/80 hover:border-[#3a4a6e]'
      }`}
    >
      {/* header row: category + value/cap */}
      <div className="flex items-center gap-2">
        <span className="flex shrink-0 items-center gap-1 rounded-md border border-gold/25 bg-gradient-to-b from-[#2a2413] to-[#1e1a0e] px-1.5 py-px font-display text-[9px] font-bold uppercase tracking-wide text-gold">
          <Zap className="h-2.5 w-2.5" />
          {fx.categoryName}
        </span>
        {fx.valuePercent != null && (
          <span className="ml-auto flex shrink-0 items-baseline gap-0.5 font-mono text-[10.5px] font-bold">
            <span className={fx.reachLimit ? 'text-val' : 'text-[#c8e6c0]'}>
              {sign}
              {fmt(fx.reachLimit ? (fx.valuePercent ?? 0) : countUp)}%
            </span>
            {fx.limitPercent != null && (
              <span className="text-[9px] font-medium text-[#7c8aa5]">/{fx.limitPercent}%</span>
            )}
          </span>
        )}
        {fx.reachLimit && (
          <span className="max-badge shrink-0 rounded bg-gradient-to-r from-teal to-val px-1 font-mono text-[8.5px] font-bold tracking-wider text-[#052e1d]">
            MAX
          </span>
        )}
      </div>

      {/* progress bar */}
      {hasProgress && (
        <div className="stat-track mt-1.5" role="progressbar" aria-valuenow={fx.valuePercent ?? 0} aria-valuemax={fx.limitPercent ?? 0}>
          <motion.div
            className={`stat-fill ${fx.reachLimit ? 'is-max' : ''}`}
            initial={{ width: '0%' }}
            animate={{ width: `${ratio * 100}%` }}
            transition={{ type: 'spring', stiffness: 90, damping: 20, delay: 0.12 + i * 0.045 }}
          />
        </div>
      )}

      {/* description */}
      <div className="mt-1.5 min-w-0">
        {cond && !simplifyMode && (
          <div className="text-[10px] italic text-[#8d99b3]">{cond}:</div>
        )}
        <div className="text-[#d5dcea]">
          <HighlightedText text={text} />
        </div>
      </div>

      {/* stacking details */}
      {fx.sources.length > 1 && (
        <>
          <button
            className="mt-1.5 flex items-center gap-1 rounded-md px-1 py-0.5 font-mono text-[9px] font-semibold text-teal transition-colors hover:bg-teal/10 hover:text-[#5ce8d5]"
            onClick={() => setOpen(o => !o)}
            aria-expanded={open}
          >
            <motion.span
              animate={{ rotate: open ? 180 : 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="flex"
            >
              <ChevronDown className="h-3 w-3" />
            </motion.span>
            {fx.sources.length} effects stacked
          </button>
          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <ul className="mt-1 space-y-1 border-l-2 border-gold/25 pl-2">
                  {fx.sources.map((s, j) => (
                    <motion.li
                      key={j}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: j * 0.04 }}
                      className="text-[9.5px] text-[#a9b4ca]"
                    >
                      <span className="font-medium text-gold-bright/90">{s.from}</span>
                      {s.param != null && (
                        <span className="ml-1 rounded bg-[#1c2a1e] px-1 font-mono font-bold text-val">
                          {(s.param - 1) * 100 > 0 ? '+' : ''}
                          {parseFloat((((s.param ?? 1) - 1) * 100).toFixed(2))}%
                        </span>
                      )}
                      <div className="text-[#7e8aa3]">{simplify(s.detail)}</div>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* limit message */}
      {fx.reachLimit && fx.limitMsg && (
        <div className="mt-1.5 rounded-md border border-val/20 bg-[#0d2a1c]/70 px-1.5 py-0.5 font-mono text-[9px] text-val/90">
          {fx.limitMsg}
        </div>
      )}
    </motion.li>
  )
}

export function EffectsPanel({ effects, simplifyMode }: { effects: MergedEffect[]; simplifyMode: boolean }) {
  if (effects.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center"
      >
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-gold/10" />
          <Info className="relative h-9 w-9 text-gold/50" />
        </div>
        <p className="max-w-[220px] text-[12px] leading-relaxed text-[#8d99b3]">
          Select up to 3 medals to see their combined effects here.
        </p>
      </motion.div>
    )
  }

  return (
    <ul className="affects-list space-y-2 p-2" aria-label="Medal effects">
      {effects.map((fx, i) => (
        <EffectRow key={`${fx.categoryId}-${fx.condType ?? -1}-${i}`} fx={fx} i={i} simplifyMode={simplifyMode} />
      ))}
    </ul>
  )
}
