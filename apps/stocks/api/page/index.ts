/**
 * Analyzer Page Endpoint
 *
 * Serves the HTML analyzer page with embedded admin dashboard.
 * This serverless function ensures the HTML is properly served on Vercel.
 *
 * v1.0.2c - API Management Dashboard
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { readFileSync } from 'fs';
import { join } from 'path';

export default function handler(_req: VercelRequest, res: VercelResponse): void {
  try {
    // Read the HTML file from the public directory
    // Using __dirname to ensure correct path resolution in monorepo
    const htmlPath = join(__dirname, '../../public', 'pages', 'analyze.html');
    const html = readFileSync(htmlPath, 'utf-8');

    // Set appropriate headers
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

    // Send the HTML
    res.status(200).send(html);
  } catch (error) {
    console.error('Error serving analyze page:', error);
    res.status(500).json({
      error: 'Failed to load analyzer page',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
