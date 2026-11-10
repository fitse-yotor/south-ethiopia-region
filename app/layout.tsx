import type { Metadata, Viewport } from 'next';
import './justice.css';
import './workspace.css';
import {PortalProvider} from '@/components/justice-portal';
import {WorkspaceProvider} from '@/lib/ws/store';
import PwaRegister from '@/components/pwa';
export const metadata: Metadata = { title: 'Southern Ethiopia Regional Justice Bureau', description: 'Access justice services, explore legal resources, and connect with the Southern Ethiopia Regional Justice Bureau. Design preview.', manifest: '/manifest.webmanifest', icons: {icon:'/justice-logo.png',shortcut:'/justice-logo.png',apple:'/icon-192.png'}, appleWebApp: { capable: true, title: 'SO Justice', statusBarStyle: 'default' } };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#1f5646' };
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body><WorkspaceProvider><PortalProvider>{children}</PortalProvider></WorkspaceProvider><PwaRegister/></body></html>}
