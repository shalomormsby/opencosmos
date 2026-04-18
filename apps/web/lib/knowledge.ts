import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const KNOWLEDGE_DIR = path.join(process.cwd(), '../../knowledge')

const BROWSABLE_DIRS = ['sources', 'guides', 'collections', 'references', 'scriptures'] as const

export type WorkType = 'work' | 'collection' | 'reference' | 'wiki'

export type KnowledgeDocMeta = {
  slug: string[]
  href: string
  category: string
  title: string
  role: string
  work_type?: WorkType
  format: string
  domain: string
  tags: string[]
  audience: string[]
  complexity: string
  summary: string
  curated_at: string
  author?: string
  tradition?: string
  era?: string
  origin_date?: string
  related_docs?: string[]
  parent_work?: string
}

export type KnowledgeDoc = KnowledgeDocMeta & {
  content: string
}

function parseMeta(data: Record<string, unknown>, slug: string[]): KnowledgeDocMeta {
  return {
    slug,
    href: '/knowledge/' + slug.join('/'),
    category: slug[0] ?? '',
    title: data.title ? String(data.title) : slug[slug.length - 1]!,
    role: data.role ? String(data.role) : '',
    work_type: isWorkType(data.work_type) ? data.work_type : undefined,
    format: data.format ? String(data.format) : '',
    domain: data.domain ? String(data.domain) : '',
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    audience: Array.isArray(data.audience) ? data.audience.map(String) : [],
    complexity: data.complexity ? String(data.complexity) : '',
    summary: data.summary ? String(data.summary).trim() : '',
    curated_at: data.curated_at ? String(data.curated_at) : '',
    author: data.author ? String(data.author) : undefined,
    tradition: data.tradition ? String(data.tradition) : undefined,
    era: data.era ? String(data.era) : undefined,
    origin_date: data.origin_date ? String(data.origin_date) : undefined,
    related_docs: Array.isArray(data.related_docs) ? data.related_docs.map(String) : undefined,
    parent_work: data.parent_work ? String(data.parent_work) : undefined,
  }
}

function isWorkType(value: unknown): value is WorkType {
  return value === 'work' || value === 'collection' || value === 'reference' || value === 'wiki'
}

export function getAllDocs(): KnowledgeDocMeta[] {
  const docs: KnowledgeDocMeta[] = []

  for (const dir of BROWSABLE_DIRS) {
    const dirPath = path.join(KNOWLEDGE_DIR, dir)
    if (!fs.existsSync(dirPath)) continue

    const files = fs.readdirSync(dirPath).filter((f) => f.endsWith('.md'))
    for (const file of files) {
      const filePath = path.join(dirPath, file)
      const fileContent = fs.readFileSync(filePath, 'utf-8')
      const { data } = matter(fileContent)
      const slug = [dir, file.replace('.md', '')] as string[]
      docs.push(parseMeta(data as Record<string, unknown>, slug))
    }
  }

  return docs.sort((a, b) => a.title.localeCompare(b.title))
}

export function getDoc(slugParts: string[]): KnowledgeDoc | null {
  const filePath = path.join(KNOWLEDGE_DIR, ...slugParts) + '.md'
  if (!fs.existsSync(filePath)) return null

  const fileContent = fs.readFileSync(filePath, 'utf-8')
  const { data, content } = matter(fileContent)

  return {
    ...parseMeta(data as Record<string, unknown>, slugParts),
    content,
  }
}
