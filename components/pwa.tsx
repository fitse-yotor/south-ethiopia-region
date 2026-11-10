'use client';
import { useEffect } from 'react';
// Registers the service worker so the portal can be installed and opened offline.
export default function PwaRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || process.env.NODE_ENV !== 'production') return;
    navigator.serviceWorker.register('/sw.js').catch(() => { /* not critical */ });
  }, []);
  return null;
}
