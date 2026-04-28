// Generate infinity loading SVG with dense perpendicular tapered lines
// High density (100+ lines) with overlapping strokes for smooth comet look

const PATH = 'M 410,250 C 410,291.9 358.3,312.6 325.4,303.3 C 292.5,294 270.9,270.9 250,250 C 229.1,229.1 207.5,206 174.6,196.7 C 141.7,187.4 90,208.1 90,250 C 90,291.9 141.7,312.6 174.6,303.3 C 207.5,294 229.1,270.9 250,250 C 270.9,229.1 292.5,206 325.4,196.7 C 358.3,187.4 410,208.1 410,250 Z';

const DUR = 3;
const N = 100;           // dense line count
const TAIL_SPAN = 0.40;  // 40% of path
const TAIL_TIME = DUR * TAIL_SPAN;

const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t); // smoothstep

function lineProps(i) {
  const t = i / (N - 1); // 0=front, 1=tail
  const e = ease(t);
  
  // Height tapers from 20 (front) to 0.5 (tail)
  const halfHeight = lerp(20, 0.5, e);
  
  // Stroke width: thick at front for solid fill, thin at tail
  const strokeWidth = lerp(6, 1.0, e);
  
  // Opacity: front=1, tail fades out
  const opacity = lerp(1, 0.08, e);
  
  // Color gradient: white → cyan → teal → dark
  let color;
  if (t < 0.05)      color = '#ffffff';
  else if (t < 0.12) color = '#ddf4ff';
  else if (t < 0.20) color = '#bbecf5';
  else if (t < 0.30) color = '#88ddee';
  else if (t < 0.45) color = '#55ccdd';
  else if (t < 0.60) color = '#2299bb';
  else if (t < 0.75) color = '#1a7799';
  else if (t < 0.88) color = '#155566';
  else               color = '#0e3344';
  
  // Filter: front gets intense glow, mid gets subtle, tail gets none
  let filter = null;
  if (t < 0.04)      filter = 'gh';  // hot white glow
  else if (t < 0.12) filter = 'gc';  // core glow
  else if (t < 0.25) filter = 'gt';  // tight glow
  else if (t < 0.45) filter = 'gs';  // subtle glow
  
  return {
    halfHeight,
    strokeWidth,
    opacity,
    color,
    filter,
    begin: -((1 - t) * TAIL_TIME),  // front=most negative (ahead), tail=0 (behind)
  };
}

let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <defs>
    <path id="inf" d="${PATH}"/>

    <filter id="bloom" x="-300%" y="-300%" width="700%" height="700%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="35" result="b1"/>
      <feGaussianBlur in="SourceGraphic" stdDeviation="15" result="b2"/>
      <feMerge><feMergeNode in="b1"/><feMergeNode in="b2"/></feMerge>
    </filter>
    <filter id="gw" x="-200%" y="-200%" width="500%" height="500%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="12"/>
    </filter>
    <filter id="gm" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="gt" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="gc" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="gh" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="b1"/>
      <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="b2"/>
      <feMerge><feMergeNode in="b2"/><feMergeNode in="b1"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="gs" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <rect width="500" height="500" fill="#040810"/>

  <!-- Base infinity track -->
  <use href="#inf" style="fill:none;stroke:rgba(100,140,200,0.07);stroke-width:5;stroke-linecap:round;stroke-linejoin:round"/>

`;

// Bloom aura lines at front (wide, blurred, behind main lines)
const bloomLines = [
  { h: 45, w: 14, color: '#1a0a44', opacity: 0.6, filter: 'bloom', begin: -TAIL_TIME },
  { h: 40, w: 12, color: '#1a0a44', opacity: 0.55, filter: 'bloom', begin: -TAIL_TIME + 0.01 },
  { h: 35, w: 10, color: '#0e3366', opacity: 0.5, filter: 'gw', begin: -TAIL_TIME + 0.02 },
  { h: 30, w: 8, color: '#0e4477', opacity: 0.45, filter: 'gw', begin: -TAIL_TIME + 0.04 },
  { h: 26, w: 7, color: '#1a6688', opacity: 0.4, filter: 'gm', begin: -TAIL_TIME + 0.06 },
  { h: 22, w: 6, color: '#1a6688', opacity: 0.35, filter: 'gm', begin: -TAIL_TIME + 0.08 },
];

svg += '  <!-- Bloom aura at front -->\n';
for (const bl of bloomLines) {
  svg += `  <line x1="0" y1="${-bl.h}" x2="0" y2="${bl.h}" stroke="${bl.color}" stroke-width="${bl.w}" stroke-linecap="round" opacity="${bl.opacity}" filter="url(#${bl.filter})">
    <animateMotion dur="${DUR}s" repeatCount="indefinite" rotate="auto" begin="${bl.begin.toFixed(3)}s" calcMode="linear"><mpath href="#inf"/></animateMotion>
  </line>\n`;
}

svg += '\n  <!-- Tapered comet body: 100 perpendicular lines -->\n';

// Render tail-first so front lines are on top
for (let i = N - 1; i >= 0; i--) {
  const p = lineProps(i);
  const h = p.halfHeight.toFixed(1);
  const filterAttr = p.filter ? ` filter="url(#${p.filter})"` : '';
  svg += `  <line x1="0" y1="${-h}" x2="0" y2="${h}" stroke="${p.color}" stroke-width="${p.strokeWidth.toFixed(1)}" stroke-linecap="round" opacity="${p.opacity.toFixed(2)}"${filterAttr}>
    <animateMotion dur="${DUR}s" repeatCount="indefinite" rotate="auto" begin="${p.begin.toFixed(4)}s" calcMode="linear"><mpath href="#inf"/></animateMotion>
  </line>\n`;
}

svg += '</svg>\n';

const fs = await import('fs');
fs.writeFileSync('/Users/shalomormsby/Developer/opencosmos/.gemini-scratch/infinity-loading.svg', svg);
console.log(`Generated SVG with ${N} tapered lines + ${bloomLines.length} bloom lines`);
console.log(`Comet spans ${(TAIL_SPAN * 100).toFixed(0)}% of path`);
console.log(`Time spacing between lines: ${(TAIL_TIME / N * 1000).toFixed(1)}ms`);
