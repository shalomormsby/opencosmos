'use client'

import { useState } from 'react'
import { PasscodeGate } from './PasscodeGate'
import { SharedChatView } from './SharedChatView'
import type { ShareConversationSnapshot } from '../../../lib/share'

type InitialState =
  | {
      kind: 'unlocked'
      snapshot: ShareConversationSnapshot
      visibility: 'public' | 'private'
      isOwner: boolean
    }
  | { kind: 'locked'; shareId: string; isOwner: boolean }

interface Props {
  initial: InitialState
}

export function ShareViewClient({ initial }: Props) {
  const [state, setState] = useState<InitialState>(initial)

  if (state.kind === 'locked') {
    return (
      <PasscodeGate
        shareId={state.shareId}
        onUnlock={({ snapshot, visibility }) =>
          setState({ kind: 'unlocked', snapshot, visibility, isOwner: state.isOwner })
        }
      />
    )
  }

  return (
    <SharedChatView
      snapshot={state.snapshot}
      visibility={state.visibility}
      isOwner={state.isOwner}
    />
  )
}
