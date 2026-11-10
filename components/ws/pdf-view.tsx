'use client';
// PDF preview using the browser's built-in PDF viewer.
// <object> shows the fallback link on browsers without an inline viewer (e.g. some mobile browsers).
import { ExternalLink, FileText } from 'lucide-react';

export function PdfView({ url, className = '', title = 'PDF preview' }: { url: string; maxPages?: number; className?: string; title?: string }) {
  const src = url.startsWith('blob:') ? url : url + '#toolbar=1&navpanes=0&view=FitH';
  return <div className={'pdf-view ' + className}>
    <object data={src} type="application/pdf" aria-label={title} className="pdf-object">
      <div className="pdf-fallback">
        <FileText size={40} />
        <p>This browser cannot show the PDF here.</p>
        <a className="ws-btn sm" href={url} target="_blank" rel="noreferrer"><ExternalLink size={14} />Open PDF in the browser</a>
      </div>
    </object>
  </div>;
}
