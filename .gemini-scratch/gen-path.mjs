// Flatter lemniscate — reduce 'a' to compress vertically
const a = 130; // was 160 — makes it less tall
const cx = 250, cy = 250;

function lemniscate(t) {
  const denom = 1 + Math.sin(t) * Math.sin(t);
  return {
    x: cx + (a * Math.cos(t)) / denom,
    y: cy + (a * Math.sin(t) * Math.cos(t)) / denom
  };
}

function lemniscateDerivative(t) {
  const s = Math.sin(t), c = Math.cos(t);
  const d = 1 + s * s;
  const d2 = d * d;
  const dx = a * (-s * d - c * 2 * s * c) / d2;
  const dy = a * ((c * c - s * s) * d - s * c * 2 * s * c) / d2;
  return { dx, dy };
}

const N = 8;
const r = (v) => Math.round(v * 10) / 10;

let path = '';
for (let i = 0; i < N; i++) {
  const t0 = (i / N) * 2 * Math.PI;
  const t1 = ((i + 1) / N) * 2 * Math.PI;
  const p0 = lemniscate(t0);
  const p1 = lemniscate(t1);
  const d0 = lemniscateDerivative(t0);
  const d1 = lemniscateDerivative(t1);
  const dt = (t1 - t0) / 3;
  const cp1 = { x: p0.x + d0.dx * dt, y: p0.y + d0.dy * dt };
  const cp2 = { x: p1.x - d1.dx * dt, y: p1.y - d1.dy * dt };
  if (i === 0) path += `M ${r(p0.x)},${r(p0.y)}`;
  path += ` C ${r(cp1.x)},${r(cp1.y)} ${r(cp2.x)},${r(cp2.y)} ${r(p1.x)},${r(p1.y)}`;
}
path += ' Z';

console.log(path);

// Bounds
let minY=500,maxY=0,minX=500,maxX=0;
for(let i=0;i<1000;i++){const t=(i/1000)*2*Math.PI;const p=lemniscate(t);if(p.y<minY)minY=p.y;if(p.y>maxY)maxY=p.y;if(p.x<minX)minX=p.x;if(p.x>maxX)maxX=p.x;}
console.log(`X: ${Math.round(minX)}-${Math.round(maxX)} (w=${Math.round(maxX-minX)}), Y: ${Math.round(minY)}-${Math.round(maxY)} (h=${Math.round(maxY-minY)}), ratio: ${((maxX-minX)/(maxY-minY)).toFixed(1)}:1`);
