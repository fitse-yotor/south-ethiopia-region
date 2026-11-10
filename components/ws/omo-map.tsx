'use client';
import { ZONES } from '@/lib/ws/org';
// Schematic (not to scale) map of the Southern Ethiopia Regional State. Zone-seat positions are approximate.
const SEAT: Record<string, [number, number]> = { // [longitude, latitude]
  'z-wolayita': [37.76, 6.86], 'z-gamo': [37.55, 6.03], 'z-gofa': [36.88, 6.3], 'z-gedeo': [38.31, 6.41], 'z-south-omo': [36.82, 5.79], 'z-ari': [36.56, 5.78],
  'z-konso': [37.48, 5.26], 'z-gardula': [37.47, 5.6], 'z-burji': [37.85, 5.33], 'z-koore': [37.15, 5.45], 'z-basketo': [36.6, 6.05], 'z-ale': [37.3, 5.15],
};
const project = ([lon, lat]: [number, number]): [number, number] => [Math.round(((lon - 36.3) / 2.3) * 320 + 40), Math.round(((7.1 - lat) / 2.2) * 400 + 30)];
/** Zone justice office name -> position on the 400x460 schematic map. */
export const OFFICE_POS: Record<string, [number, number]> = Object.fromEntries(ZONES.filter(z => SEAT[z.id]).map(z => [z.name + ' office', project(SEAT[z.id])]));
export type MapMarker = { office: string; label?: string; value?: number; tone?: 'blue' | 'red' | 'gold' | 'teal' | 'grey'; size?: number };

export function OmoMap({ markers, selected, onSelect, legend }: { markers: MapMarker[]; selected?: string; onSelect?: (office: string) => void; legend?: React.ReactNode }) {
  return <figure className="omo-map">
    <svg viewBox="0 0 400 460" role="img" aria-label="Schematic map of the Southern Ethiopia Regional State with zone justice offices">
      <path className="omo-land" d="M60 60 L180 28 L300 40 L368 110 L372 230 L350 330 L290 400 L200 430 L110 410 L50 340 L34 220 L40 120 Z" />
      {markers.map(m => { const p = OFFICE_POS[m.office]; if (!p) return null; const r = m.size ?? 9;
        return <g key={m.office} className={'omo-pin tone-' + (m.tone || 'blue') + (selected === m.office ? ' sel' : '')} transform={`translate(${p[0]} ${p[1]})`} onClick={() => onSelect?.(m.office)} role={onSelect ? 'button' : undefined} tabIndex={onSelect ? 0 : undefined} onKeyDown={e => { if (e.key === 'Enter') onSelect?.(m.office); }}>
          <circle r={r + 6} className="omo-hit" /><circle r={r} />{m.value !== undefined && <text className="omo-val" dy="4">{m.value}</text>}
          <text className="omo-name" y={-r - 6}>{m.label || m.office.replace(' Zone office', '')}</text>
        </g>; })}
    </svg>
    <figcaption>{legend}<span>Schematic map - positions approximate, not to scale.</span></figcaption>
  </figure>;
}
