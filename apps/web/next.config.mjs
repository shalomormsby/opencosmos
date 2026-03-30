import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@opencosmos/ui'],
  env: {
    COSMO_SYSTEM_PROMPT: readFileSync(
      join(__dirname, '../../packages/ai/COSMO_SYSTEM_PROMPT.md'),
      'utf-8'
    ),
  },
}

export default nextConfig
