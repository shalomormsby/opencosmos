// Shared constants — safe to import in client components (no `fs` dependency)

export const CATEGORY_LABELS: Record<string, string> = {
  sources: 'Source Texts',
  guides: 'Guides',
  collections: 'Collections',
  references: 'References',
  scriptures: 'Scriptures',
}

export const ROLE_LABELS: Record<string, string> = {
  source: 'Source text',
  commentary: 'Commentary',
  reference: 'Reference',
  guide: 'Guide',
  collection: 'Collection',
}
