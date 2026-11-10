// Region-level staffing rules (pure, testable): creating woreda accounts and posting prosecutors to woredas.
// A prosecutor belongs to exactly one woreda; cases belong to the woreda, not to the prosecutor, so a prosecutor
// cannot be moved while still holding open cases there.
import type { Permission, User, WSData } from './types';
import { inScope, unitById, unitName } from './org';

export const STAFF_ROLES = ['woreda-coordinator', 'prosecutor'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];
type Can = (p: Permission) => boolean;
export type Plan<T> = ({ ok: true } & T) | { ok: false; error: string };

export const openCasesOf = (d: WSData, userId: string) => d.cases.filter(c => c.prosecutorId === userId && c.status !== 'Closed');

/** Who staffs a woreda right now. */
export function woredaStaffing(d: WSData, woredaId: string) {
  const here = d.users.filter(u => u.scope?.level === 'woreda' && u.scope.id === woredaId);
  return {
    coordinators: here.filter(u => u.roleId === 'woreda-coordinator'),
    prosecutors: here.filter(u => u.roleId === 'prosecutor'),
    openCases: d.cases.filter(c => c.woredaId === woredaId && c.status !== 'Closed').length,
  };
}
/** Active prosecutors who have no woreda yet. */
export const waitingProsecutors = (d: WSData) => d.users.filter(u => u.roleId === 'prosecutor' && u.status === 'active' && !u.scope);

export function planPost(d: WSData, actor: User, can: Can, userId: string, woredaId: string): Plan<{ user: User; from?: string }> {
  if (!can('staff.manage')) return { ok: false, error: 'Only the Region can post prosecutors to woredas.' };
  if (unitById(woredaId)?.level !== 'woreda' || !inScope(actor.scope, woredaId)) return { ok: false, error: 'Choose a woreda inside your region.' };
  const u = d.users.find(x => x.id === userId);
  if (!u || u.roleId !== 'prosecutor') return { ok: false, error: 'Choose a prosecutor.' };
  if (u.status !== 'active') return { ok: false, error: `${u.name} is deactivated.` };
  if (u.scope?.id === woredaId) return { ok: false, error: `${u.name} already works in ${unitName(woredaId)}.` };
  const open = openCasesOf(d, u.id);
  if (u.scope && open.length) return { ok: false, error: `${u.name} still holds ${open.length} open case${open.length > 1 ? 's' : ''} in ${unitName(u.scope.id)}. The Woreda Coordinator must reassign them first.` };
  return { ok: true, user: u, from: u.scope?.id };
}

export function newWoredaAccount(d: WSData, actor: User, can: Can, f: { woredaId: string; roleId: string; name: string; email: string; phone: string }): Plan<{ user: Omit<User, 'id' | 'createdAt'> }> {
  if (!can('staff.manage')) return { ok: false, error: 'Only the Region can create woreda accounts.' };
  if (!(STAFF_ROLES as readonly string[]).includes(f.roleId)) return { ok: false, error: 'Woreda accounts are Woreda Coordinators or Prosecutors.' };
  if (unitById(f.woredaId)?.level !== 'woreda' || !inScope(actor.scope, f.woredaId)) return { ok: false, error: 'Choose a woreda inside your region.' };
  const name = f.name.trim(), email = f.email.trim().toLowerCase();
  if (!name) return { ok: false, error: 'Enter the full name.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'Enter a valid email address.' };
  if (d.users.some(u => u.email.toLowerCase() === email)) return { ok: false, error: 'An account with this email already exists.' };
  return { ok: true, user: { name, email, phone: f.phone.trim(), password: 'Demo@123', roleId: f.roleId, office: unitName(f.woredaId), scope: { level: 'woreda', id: f.woredaId }, status: 'active' } };
}
