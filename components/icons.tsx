type P = { size?: number; className?: string };
const base = (size = 16) => ({ width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true });

export const TrashIcon = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg>
);
export const PencilIcon = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
);
export const UpIcon = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M18 15l-6-6-6 6" /></svg>
);
export const DownIcon = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M6 9l6 6 6-6" /></svg>
);
export const PlayIcon = ({ size }: P) => (
  <svg width={size ?? 16} height={size ?? 16} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
);
export const PauseIcon = ({ size }: P) => (
  <svg width={size ?? 16} height={size ?? 16} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
);
export const RestartIcon = ({ size }: P) => (
  <svg width={size ?? 14} height={size ?? 14} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h2v14H6zm3 7l10-7v14z" /></svg>
);
export const PinIcon = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M12 21s7-6.5 7-11a7 7 0 1 0-14 0c0 4.5 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
);
export const FileIcon = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6" /></svg>
);
export const SparkIcon = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M12 3l1.8 4.6L18.5 9l-4.7 1.4L12 15l-1.8-4.6L5.5 9l4.7-1.4z" /><path d="M19 15l.8 2 2.2.6-2.2.7L19 20l-.8-1.7-2.2-.7 2.2-.6z" /></svg>
);
export const TicketIcon = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M8 15h4" /></svg>
);
export const WalletIcon = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M16 14h2" /></svg>
);
export const MapIcon = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" /><path d="M9 4v14M15 6v14" /></svg>
);
