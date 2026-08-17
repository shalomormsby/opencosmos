import { ImageResponse } from 'next/og'

export const alt = 'Xensō — a game you play as yourself'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/**
 * Link preview for /xenso — the card people see when the game is texted to them.
 *
 * The markup is inlined rather than using `OpenGraphCard` from @opencosmos/ui,
 * which exists for exactly this job and cannot do it: the package bundle carries
 * a top-level "use client", so importing the component into a server-rendered OG
 * route yields a client reference and the route dies with "Attempted to call
 * OpenGraphCard() from the server". The Studio app's own opengraph-image inlines
 * its markup for the same reason. The visual language here — radial ground,
 * ambient accent wash, centred stack — follows the component deliberately, so
 * the two stay recognisably one system until the library ships it server-safe.
 *
 * Satori resolves no CSS variables, so every colour is an explicit hex, and any
 * element with more than one child needs an explicit display: flex.
 */

/**
 * Satori reads TTF, OTF and WOFF — but not WOFF2, which is all Google Fonts
 * serves to a modern browser. An old User-Agent forces the TTF stylesheet.
 * Returns null rather than throwing: a missing font should cost the card its
 * typeface, never its existence.
 */
async function loadFont(family: string, weight: number): Promise<ArrayBuffer | null> {
  try {
    const cssResponse = await fetch(
      `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:wght@${weight}`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1',
        },
      }
    )
    if (!cssResponse.ok) return null

    const url = (await cssResponse.text()).match(
      /src: url\((.+?)\) format\('(opentype|truetype)'\)/
    )?.[1]
    if (!url) return null

    const fontResponse = await fetch(url)
    return fontResponse.ok ? await fontResponse.arrayBuffer() : null
  } catch {
    return null
  }
}

const FONT_FAMILY = 'Space Grotesk'
const ACCENT = '#0099ff'

export default async function Image() {
  const [bold, regular] = await Promise.all([
    loadFont(FONT_FAMILY, 700),
    loadFont(FONT_FAMILY, 400),
  ])

  const fonts = [
    bold && { name: FONT_FAMILY, data: bold, style: 'normal' as const, weight: 700 as const },
    regular && { name: FONT_FAMILY, data: regular, style: 'normal' as const, weight: 400 as const },
  ].filter((f): f is NonNullable<typeof f> => Boolean(f))

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          padding: 80,
          position: 'relative',
          backgroundImage: 'radial-gradient(circle at 50% 0%, #0b1520 0%, #000000 70%)',
          fontFamily: fonts.length ? FONT_FAMILY : 'sans-serif',
          color: '#ffffff',
        }}
      >
        {/* Ambient accent wash, as in OpenGraphCard's dark variants. */}
        <div
          style={{
            position: 'absolute',
            top: '-50%',
            left: '-50%',
            width: '200%',
            height: '200%',
            backgroundImage: `radial-gradient(circle at 50% 50%, ${ACCENT} 0%, transparent 60%)`,
            opacity: 0.12,
          }}
        />

        {/* An ensō framing the name — the stranger found to have been inside the
            circle all along. It sits behind the wordmark rather than above it
            because a small accent-coloured ring over centred text reads as a
            loading spinner no matter how it is drawn. Large, faint and framing,
            it can only read as what it is. */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width={480} height={480} viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke={ACCENT}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeDasharray="252 37"
              transform="rotate(-118 50 50)"
              opacity="0.5"
            />
          </svg>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
          }}
        >
          <div style={{ fontSize: 148, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1 }}>
            Xensō
          </div>

          <div
            style={{
              fontSize: 44,
              fontWeight: 400,
              marginTop: 26,
              opacity: 0.92,
              letterSpacing: '-0.01em',
            }}
          >
            A game you play as yourself.
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: 56,
            fontSize: 24,
            fontWeight: 400,
            opacity: 0.45,
            letterSpacing: '0.09em',
            textTransform: 'uppercase',
          }}
        >
          by OpenCosmos
        </div>
      </div>
    ),
    { ...size, fonts }
  )
}
