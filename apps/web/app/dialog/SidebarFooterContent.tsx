'use client'

import { AuthButton } from '../AuthButton'
import { SidebarAvatar } from '../SidebarAvatar'
import { TokenGauge } from '@/components/TokenGauge'
import { useCosmoSession } from './useCosmoSession'

type Props = {
  /** When true, only the avatar + invisible PM tap-target are shown (collapsed sidebar / rail mode). */
  compact?: boolean
}

export function SidebarFooterContent({ compact = false }: Props) {
  const {
    mounted,
    apiKey,
    tokensUsed,
    tokenBudget,
    pmMode,
    showPmInput,
    setShowPmInput,
    deactivatePm,
  } = useCosmoSession()

  const onPmClick = () => (pmMode ? deactivatePm() : setShowPmInput(!showPmInput))

  if (compact) {
    return (
      <div className="relative flex justify-center">
        <SidebarAvatar />
        <button
          onClick={onPmClick}
          className="absolute inset-0 opacity-0"
          aria-label={pmMode ? 'Deactivate PM mode' : 'Activate PM mode'}
          tabIndex={-1}
        />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <SidebarAvatar />
      {mounted && (
        <TokenGauge
          used={tokensUsed}
          total={tokenBudget}
          unlimited={!!apiKey}
          compact
          className="shrink-0"
        />
      )}
      <AuthButton className="flex-1" />
      <button
        onClick={onPmClick}
        className="opacity-0 w-4 h-4 shrink-0"
        aria-label={pmMode ? 'Deactivate PM mode' : 'Activate PM mode'}
        title={pmMode ? 'PM mode active — click to deactivate' : 'PM mode'}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {pmMode ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 018 0M5 11h14a1 1 0 011 1v7a2 2 0 01-2 2H6a2 2 0 01-2-2v-7a1 1 0 011-1z" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zM10 9V7a2 2 0 114 0v2H10z" />
          )}
        </svg>
      </button>
    </div>
  )
}
