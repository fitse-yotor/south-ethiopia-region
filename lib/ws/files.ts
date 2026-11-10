'use client';
// Browser-side file store for the demo (IndexedDB). In production these files go to private object storage.
import { useEffect, useState } from 'react';

const DB = 'sojp-files', STORE = 'files';
function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
export async function saveFile(file: File): Promise<string> {
  const id = 'f-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  try {
    const db = await open();
    await new Promise<void>((res, rej) => { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).put(file, id); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
    return 'idb:' + id;
  } catch {
    return URL.createObjectURL(file);
  }
}
async function loadFile(id: string): Promise<Blob | null> {
  try {
    const db = await open();
    return await new Promise(res => { const r = db.transaction(STORE).objectStore(STORE).get(id); r.onsuccess = () => res(r.result || null); r.onerror = () => res(null); });
  } catch { return null; }
}
export function useFileUrl(url: string | undefined) {
  const [resolved, setResolved] = useState<string | null>(url && !url.startsWith('idb:') ? url : null);
  useEffect(() => {
    if (!url) return;
    if (!url.startsWith('idb:')) { setResolved(url); return; }
    let obj: string | null = null, live = true;
    loadFile(url.slice(4)).then(b => { if (b && live) { obj = URL.createObjectURL(b); setResolved(obj); } });
    return () => { live = false; if (obj) URL.revokeObjectURL(obj); };
  }, [url]);
  return resolved;
}
export const ACCEPT_DOCS = '.pdf,.doc,.docx,.mp4,.webm,.mov,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,video/*';
export function detectType(f: File): 'pdf' | 'word' | 'video' | null {
  const n = f.name.toLowerCase();
  if (n.endsWith('.pdf') || f.type === 'application/pdf') return 'pdf';
  if (n.endsWith('.doc') || n.endsWith('.docx')) return 'word';
  if (f.type.startsWith('video/') || /\.(mp4|webm|mov)$/.test(n)) return 'video';
  return null;
}
export const fmtSize = (b: number) => b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
