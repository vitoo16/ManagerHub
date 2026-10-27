import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';

type IconName = 'grid' | 'database' | 'layers' | 'shield' | 'compass' | 'sun' | 'moon' |
  'settings' | 'chevron' | 'arrow' | 'plus' | 'search' | 'close' | 'file' | 'menu' | 'check' |
  'warning' | 'sparkles' | 'book' | 'trash' | 'monitor' | 'download';

const pathData: Record<IconName, ReactNode> = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
  database: <><ellipse cx="12" cy="5" rx="8.5" ry="3"/><path d="M3.5 5v14c0 4 17 4 17 0V5M3.5 12c0 4 17 4 17 0"/></>,
  layers: <><path d="m12 2 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 17l9 5 9-5"/></>,
  shield: <path d="m12 2 8 4v6c0 5-3.2 8-8 10-4.8-2-8-5-8-10V6l8-4Z"/>,
  compass: <><circle cx="12" cy="12" r="9"/><path d="m15 9-2 6-4 1 2-6 4-1Z"/></>,
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M19 5l-1.5 1.5m-11 11L5 19"/></>,
  moon: <path d="M20.5 13A8.5 8.5 0 0 1 11 3.5 8.5 8.5 0 1 0 20.5 13Z"/>,
  settings: <><path d="M9.5 3.5 10 2h4l.5 1.5 2 1 .9-.6 2.8 2.8-.7 1.1 1 2L22 10v4l-1.5.5-1 2 .7 1.1-2.8 2.8-.9-.6-2 1L14 22h-4l-.5-1.5-2-1-.9.6-2.8-2.8.7-1.1-1-2L2 14v-4l1.5-.5 1-2-.7-1.1L6.6 3.6l.9.6 2-1Z"/><circle cx="12" cy="12" r="3"/></>,
  chevron: <path d="m9 5 7 7-7 7"/>,
  arrow: <><path d="M5 12h14m-6-6 6 6-6 6"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  search: <><circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/></>,
  close: <path d="m5 5 14 14M19 5 5 19"/>,
  file: <><path d="M5 2h9l5 5v15H5z"/><path d="M14 2v5h5"/></>,
  menu: <path d="M4 6h16M4 12h16M4 18h16"/>,
  check: <path d="m5 12 5 5L20 7"/>,
  warning: <><path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v5m0 3v.5"/></>,
  sparkles: <><path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z"/></>,
  book: <><path d="M3 4h7c2 0 2 1 2 3v14c0-2-1-3-3-3H3V4ZM21 4h-7c-2 0-2 1-2 3v14c0-2 1-3 3-3h6V4Z"/></>,
  trash: <><path d="M4 7h16M9 4h6M6 7l1 14h10l1-14M10 11v6m4-6v6"/></>,
  monitor: <><rect x="2" y="3" width="20" height="15" rx="2"/><path d="M8 22h8m-4-4v4"/></>,
  download: <><path d="M12 3v13m-5-5 5 5 5-5M4 18v3h16v-3"/></>
};

export function Icon({ name, size = 18, className = '' }: { name: IconName; size?: number; className?: string }) {
  return <svg aria-hidden="true" className={className} width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{pathData[name]}</svg>;
}

export function Button({ variant = 'default', children, className = '', ...props }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'primary' | 'quiet' | 'danger' }) {
  return <button className={'mh-button mh-button--' + variant + ' ' + className} {...props}>{children}</button>;
}

export function Surface({ glass = false, className = '', children, ...props }:
  HTMLAttributes<HTMLDivElement> & { glass?: boolean }) {
  return <div className={(glass ? 'mh-surface mh-surface--glass ' : 'mh-surface ') + className} {...props}>{children}</div>;
}

export function Status({ tone = 'neutral', children }: { tone?: 'positive' | 'warning' | 'neutral' | 'info'; children: ReactNode }) {
  return <span className={'mh-status mh-status--' + tone}><span aria-hidden="true" className="mh-status__dot"/>{children}</span>;
}

export function SectionHeading({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return <div className="mh-section-heading"><div><span className="mh-eyebrow">{eyebrow}</span><h2>{title}</h2></div>{children}</div>;
}
