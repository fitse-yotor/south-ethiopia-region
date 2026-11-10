// Organisation hierarchy: Region → Zone → Woreda.
// Source: Wikipedia, "South Ethiopia Regional State" (12 zones with their woredas). Towns administered as
// woreda-level city administrations are included as "<Name> Town". Please verify against the official
// regional list before operational use. Self-contained (no imports) so it can be unit-tested directly.

export type OrgLevel = 'region' | 'zone' | 'woreda';
export type Scope = { level: OrgLevel; id: string };
export type OrgUnit = { id: string; level: OrgLevel; parentId: string | null; name: string; seat?: string };

export const REGION_ID = 'region';
export const REGION_NAME = 'Southern Ethiopia Regional State';

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const tidy = (s: string) => s.replace(/ \(town\)$/i, ' Town');

/** [zone name, seat, woredas]. Entries ending in "(town)" are town administrations. */
const SOURCE: [string, string, string[]][] = [
  ['Wolayita', 'Wolaita Sodo', ['Abala Abaya', 'Areka (town)', 'Bale Hawassa (town)', 'Bayra Koysha', 'Bedessa (town)', 'Boditi (town)', 'Boloso Bombe', 'Boloso Sore', 'Bombe (town)', 'Damot Gale', 'Damot Pulasa', 'Damot Sore', 'Damot Weyde', 'Diguna Fango', 'Dimtu (town)', 'Gesuba (town)', 'Gununo (town)', 'Hobicha', 'Humbo', 'Kawo Koysha', 'Kindo Didaye', 'Kindo Koysha', 'Offa', 'Tebela (town)', 'Shanto (town)', 'Sodo Zuria']],
  ['Gamo', 'Arba Minch', ['Arba Minch Zuria', 'Bonke', 'Boreda', 'Chencha', 'Chencha (town)', 'Deramalo', 'Dita', 'Gacho Baba', 'Garda Marta', 'Geressie (town)', 'Geressie Zuria', 'Kamba (town)', 'Kamba Zuria', 'Kucha', 'Kucha Alfa', 'Mirab Abaya', 'Qogota', 'Selamber (town)', 'Wacha (town)', 'Zefne (town)']],
  ['Gofa', 'Sawla', ['Beto (town)', 'Bulki (town)', 'Demba Gofa', 'Galma (town)', 'Geze Gofa', 'Laha (town)', 'Melo Gada', 'Melokoza', 'Oyda', 'Sawla (town)', 'Uba Debretsehay', 'Zala']],
  ['Gedeo', 'Dilla', ['Bule (town)', 'Bule', 'Chelelektu (town)', 'Chorso', 'Dila Zuria', 'Gedeb', 'Gedeb (town)', 'Irgachefe (town)', 'Kochere', 'Raphe', 'Wenago', 'Wenago (town)', 'Yirgachefe']],
  ['South Omo', 'Dimeka', ['Bena Tsemay', 'Dasenech', 'Dimeka (town)', 'Hamer', 'Male', 'Nyangatom', 'Selamago', 'Turmi (town)']],
  ['Ari', 'Jinka', ['Baka Dawla Ari', 'Debub Ari', 'Gazer (town)', 'Gelila (town)', 'Gelila', 'Jinka (town)', 'Semen Ari', 'Woba Ari']],
  ['Konso', 'Karati', ['Karati (town)', 'Karat Zuria', 'Kena', 'Kolme', 'Segen Zuria']],
  ['Gardula', 'Gidole', ['Dirashe', 'Gidole (town)']],
  ['Burji', 'Soyama', ['Soyama (town)', 'Soyama Zuria']],
  ['Koore', 'Kele', ['Gorka', 'Kelle (town)', 'Sarmale']],
  ['Basketo', 'Laska', ['Laska (town)', 'Laska Zuria']],
  ['Ale', 'Kolango', ['Kolango (town)', 'Kolango Zuria']],
];

export const REGION: OrgUnit = { id: REGION_ID, level: 'region', parentId: null, name: REGION_NAME };
export const ZONES: OrgUnit[] = SOURCE.map(([n, seat]) => ({ id: 'z-' + slug(n), level: 'zone', parentId: REGION_ID, name: n + ' Zone', seat }));
export const WOREDAS: OrgUnit[] = SOURCE.flatMap(([zn, , ws]) => ws.map(w => ({ id: `w-${slug(zn)}-${slug(tidy(w))}`, level: 'woreda' as const, parentId: 'z-' + slug(zn), name: tidy(w) })));
export const ALL_UNITS: OrgUnit[] = [REGION, ...ZONES, ...WOREDAS];

const BY_ID = new Map(ALL_UNITS.map(u => [u.id, u]));
export const unitById = (id?: string | null): OrgUnit | undefined => (id ? BY_ID.get(id) : undefined);
export const woredasOfZone = (zoneId: string): OrgUnit[] => WOREDAS.filter(w => w.parentId === zoneId);
export const zoneOfWoreda = (woredaId?: string | null): OrgUnit | undefined => { const w = unitById(woredaId); return w?.level === 'woreda' ? unitById(w.parentId) : undefined; };
/** Woreda name, or the zone / region office name for staff above woreda level. */
export const unitName = (id?: string | null) => unitById(id)?.name || '—';
/** Display name for the office of a scope: "Hamer", "South Omo Zone office", "Regional office". */
export const scopeOfficeName = (s?: Scope | null) => !s ? '—' : s.level === 'woreda' ? unitName(s.id) : s.level === 'zone' ? unitName(s.id) + ' office' : 'Regional office';
export const scopeLabel = (s?: Scope | null) => !s ? '—' : s.level === 'woreda' ? `${unitName(s.id)} woreda · ${unitName(unitById(s.id)?.parentId)}` : s.level === 'zone' ? unitName(s.id) : REGION_NAME;

/** Woreda ids covered by a scope. Region → all, zone → its woredas, woreda → itself, no scope → none. */
export function woredaIdsInScope(s?: Scope | null): string[] {
  if (!s) return [];
  if (s.level === 'region') return WOREDAS.map(w => w.id);
  if (s.level === 'zone') return woredasOfZone(s.id).map(w => w.id);
  return unitById(s.id)?.level === 'woreda' ? [s.id] : [];
}
/** True if a woreda lies inside the scope. */
export function inScope(s: Scope | null | undefined, woredaId?: string | null): boolean {
  if (!s || !woredaId) return false;
  if (s.level === 'region') return unitById(woredaId)?.level === 'woreda';
  if (s.level === 'zone') return zoneOfWoreda(woredaId)?.id === s.id;
  return s.id === woredaId;
}
/** Zone offices shown on the public website. */
export const ZONE_OFFICES: string[] = ZONES.map(z => z.name + ' office');
/** Every woreda name – used in dropdowns. Names are unique across the region. */
export const WOREDA_NAMES: string[] = WOREDAS.map(w => w.name);
export const woredaByName = (name: string): OrgUnit | undefined => WOREDAS.find(w => w.name === name);
