// Run with: node --test lib/ws/org.test.ts   (Node 22.18+ strips types natively; no install needed)
import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_UNITS, WOREDAS, ZONES, inScope, scopeLabel, unitById, woredaIdsInScope, woredaByName, type Scope } from './org.ts';

test('hierarchy is complete and consistent', () => {
  assert.equal(ZONES.length, 12);
  assert.ok(WOREDAS.length > 80);
  assert.equal(new Set(ALL_UNITS.map(u => u.id)).size, ALL_UNITS.length, 'ids unique');
  assert.equal(new Set(WOREDAS.map(w => w.name)).size, WOREDAS.length, 'woreda names unique');
  for (const w of WOREDAS) assert.equal(unitById(w.parentId)?.level, 'zone');
});

const hamer = woredaByName('Hamer')!.id, jinka = woredaByName('Jinka Town')!.id, wolaita = woredaByName('Offa')!.id;
const woreda: Scope = { level: 'woreda', id: hamer };
const zone: Scope = { level: 'zone', id: 'z-south-omo' };
const region: Scope = { level: 'region', id: 'region' };

test('woreda scope sees only its own woreda', () => {
  assert.deepEqual(woredaIdsInScope(woreda), [hamer]);
  assert.ok(inScope(woreda, hamer));
  assert.ok(!inScope(woreda, woredaByName('Male')!.id));
  assert.ok(!inScope(woreda, jinka));
});
test('zone scope sees its woredas only', () => {
  assert.ok(inScope(zone, hamer));
  assert.ok(!inScope(zone, jinka), 'Jinka Town is in Ari Zone, not South Omo');
  assert.ok(!inScope(zone, wolaita));
  assert.equal(woredaIdsInScope(zone).length, 8);
});
test('region scope sees every woreda', () => {
  assert.equal(woredaIdsInScope(region).length, WOREDAS.length);
  assert.ok(inScope(region, wolaita) && inScope(region, hamer));
});
test('no scope or unknown ids see nothing', () => {
  assert.ok(!inScope(null, hamer));
  assert.ok(!inScope(region, 'nope'));
  assert.ok(!inScope(zone, null));
  assert.deepEqual(woredaIdsInScope(undefined), []);
  assert.match(scopeLabel(woreda), /Hamer woreda · South Omo Zone/);
});
