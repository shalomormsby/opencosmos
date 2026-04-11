'use client'

import { AppSidebar, AppSidebarProvider, AppSidebarInset, OpenCosmosIcon, useAppSidebar } from '@opencosmos/ui'
import { MessageSquare, BookOpen, ExternalLink } from 'lucide-react'
import { SidebarAvatar } from './SidebarAvatar'
import { SidebarUsage } from './SidebarUsage'

function ShellFooter() {
  const { isOpen } = useAppSidebar()

  if (!isOpen) return <SidebarAvatar />

  return (
    <div className="flex items-center gap-2">
      <SidebarAvatar />
      <SidebarUsage />
    </div>
  )
}

export function AppShell({
  children,
  activePath,
}: {
  children: React.ReactNode
  activePath?: string
}) {
  return (
    <AppSidebarProvider defaultOpen={false} storageKey="appsidebar:shell">
      <AppSidebar
        logo={<OpenCosmosIcon size={20} />}
        bottomItems={[
          {
            icon: <MessageSquare className="w-4 h-4" />,
            label: 'Dialog',
            href: '/dialog',
            active: activePath === '/dialog',
          },
          {
            icon: <BookOpen className="w-4 h-4" />,
            label: 'Knowledge',
            href: '/knowledge',
            active: activePath === '/knowledge',
          },
          {
            icon: <ExternalLink className="w-4 h-4" />,
            label: 'Studio',
            href: 'https://studio.opencosmos.ai/docs/getting-started',
            external: true,
          },
        ]}
        footer={<ShellFooter />}
      />
      <AppSidebarInset>{children}</AppSidebarInset>
    </AppSidebarProvider>
  )
}
