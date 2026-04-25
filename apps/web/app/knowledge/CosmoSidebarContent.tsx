'use client'

import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, Button } from '@opencosmos/ui'
import { CosmoChatPanel } from '../dialog/CosmoChatPanel'
import { DialogHistoryPanel } from '../dialog/DialogHistoryPanel'
import { useCosmoSession } from '../dialog/useCosmoSession'

type Tab = 'dialog' | 'history'

export function CosmoSidebarContent() {
  const [tab, setTab] = useState<Tab>('dialog')
  const { startNew } = useCosmoSession()

  return (
    <div className="flex flex-col h-full">
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as Tab)}
        className="shrink-0 px-5 pt-2"
      >
        <TabsList className="w-full grid grid-cols-2 bg-transparent h-auto p-0 rounded-none border-b border-foreground/10">
          <TabsTrigger
            value="dialog"
            className="rounded-none bg-transparent shadow-none border-b-2 border-transparent -mb-px py-2 text-foreground/50 data-[state=active]:bg-transparent data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none"
          >
            Dialog
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="rounded-none bg-transparent shadow-none border-b-2 border-transparent -mb-px py-2 text-foreground/50 data-[state=active]:bg-transparent data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none"
          >
            History
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {tab === 'dialog' ? (
          <>
            <div className="shrink-0 px-5 pt-3 pb-1">
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1.5"
                onClick={() => {
                  startNew()
                  setTab('dialog')
                }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New dialog
              </Button>
            </div>
            <div className="flex-1 min-h-0">
              <CosmoChatPanel />
            </div>
          </>
        ) : (
          <DialogHistoryPanel
            showNewButton={false}
            onOpen={() => setTab('dialog')}
          />
        )}
      </div>
    </div>
  )
}
