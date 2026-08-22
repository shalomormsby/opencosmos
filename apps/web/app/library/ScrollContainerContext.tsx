'use client'

import { createContext } from 'react'

/**
 * Provides the scrollable container element to descendants. KnowledgeShell
 * supplies the main-content panel; components that do scroll-spy (e.g.
 * TableOfContents) read this to bind listeners to the right element instead of
 * window. Routes that don't use KnowledgeShell can safely fall back to window.
 */
export const ScrollContainerContext = createContext<HTMLElement | null>(null)
