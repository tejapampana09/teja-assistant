import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function Icon({ size = 24, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

const makeIcon = (children: React.ReactNode) =>
  function LocalIcon(props: IconProps) {
    return <Icon {...props}>{children}</Icon>;
  };

export const Activity = makeIcon(<><path d="M3 12h4l3 8 4-16 3 8h4" /></>);
export const BookOpenCheck = makeIcon(<><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M4 4v15.5" /><path d="M20 4v13" /><path d="M6.5 4H20" /><path d="m8 11 2 2 4-5" /></>);
export const Bot = makeIcon(<><rect x="5" y="8" width="14" height="10" rx="3" /><path d="M12 4v4" /><path d="M9 13h.01" /><path d="M15 13h.01" /></>);
export const Brain = makeIcon(<><path d="M8 6a3 3 0 0 0-3 3v1a3 3 0 0 0 0 6v1a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" /><path d="M16 6a3 3 0 0 1 3 3v1a3 3 0 0 1 0 6v1a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3Z" /></>);
export const CalendarClock = makeIcon(<><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" /><path d="M12 14v3l2 1" /></>);
export const CalendarDays = CalendarClock;
export const Check = makeIcon(<><path d="m20 6-11 11-5-5" /></>);
export const CheckCheck = makeIcon(<><path d="m2 12 5 5L17 7" /><path d="m8 12 5 5L23 7" /></>);
export const CheckCircle2 = makeIcon(<><circle cx="12" cy="12" r="9" /><path d="m9 12 2 2 4-5" /></>);
export const CheckSquare = makeIcon(<><rect x="4" y="4" width="16" height="16" rx="2" /><path d="m9 12 2 2 4-5" /></>);
export const Chrome = makeIcon(<><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" /><path d="M21.17 8H12" /><path d="M3.95 6.06 8.54 14" /><path d="M10.88 21.94 15.46 14" /></>);
export const Clock3 = makeIcon(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>);
export const Database = makeIcon(<><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" /><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></>);
export const FolderKanban = makeIcon(<><path d="M3 6h7l2 2h9v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /><path d="M8 12v4" /><path d="M12 11v5" /><path d="M16 13v3" /></>);
export const Home = makeIcon(<><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10" /></>);
export const Inbox = makeIcon(<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 14h5l2 3h4l2-3h5" /></>);
export const ListChecks = makeIcon(<><path d="m3 7 2 2 4-4" /><path d="M11 7h10" /><path d="m3 17 2 2 4-4" /><path d="M11 17h10" /></>);
export const Loader2 = makeIcon(<><path d="M21 12a9 9 0 1 1-6.2-8.56" /></>);
export const LockKeyhole = makeIcon(<><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /><path d="M12 15v2" /></>);
export const LogOut = makeIcon(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></>);
export const Menu = makeIcon(<><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" /></>);
export const MessageCircle = makeIcon(<><path d="M21 11.5a8.5 8.5 0 0 1-12.8 7.3L3 20l1.4-4.7A8.5 8.5 0 1 1 21 11.5Z" /></>);
export const MessageSquare = makeIcon(<><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" /></>);
export const Mic = makeIcon(<><path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><path d="M12 19v3" /></>);
export const MicOff = makeIcon(<><path d="m2 2 20 20" /><path d="M9 9v3a3 3 0 0 0 5.1 2.1" /><path d="M15 9.3V6a3 3 0 0 0-5.1-2.1" /><path d="M19 10v2a7 7 0 0 1-.7 3" /><path d="M5 10v2a7 7 0 0 0 10 6.3" /></>);
export const Pause = makeIcon(<><path d="M8 5v14" /><path d="M16 5v14" /></>);
export const Pencil = makeIcon(<><path d="M17 3a2.8 2.8 0 0 1 4 4L8 20l-5 1 1-5Z" /></>);
export const Play = makeIcon(<><path d="m8 5 12 7-12 7Z" /></>);
export const RefreshCw = makeIcon(<><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" /></>);
export const Plus = makeIcon(<><path d="M12 5v14" /><path d="M5 12h14" /></>);
export const Save = makeIcon(<><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" /><path d="M17 21v-8H7v8" /><path d="M7 3v5h8" /></>);
export const Search = makeIcon(<><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>);
export const Send = makeIcon(<><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></>);
export const Sparkles = makeIcon(<><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z" /><path d="M5 3v4" /><path d="M3 5h4" /><path d="M19 17v4" /><path d="M17 19h4" /></>);
export const Square = makeIcon(<><rect x="6" y="6" width="12" height="12" rx="1" /></>);
export const StickyNote = makeIcon(<><path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z" /><path d="M16 3v5h5" /></>);
export const SunMedium = makeIcon(<><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.9 4.9 1.4 1.4" /><path d="m17.7 17.7 1.4 1.4" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m4.9 19.1 1.4-1.4" /><path d="m17.7 6.3 1.4-1.4" /></>);
export const Trash2 = makeIcon(<><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v5" /><path d="M14 11v5" /></>);
export const User = makeIcon(<><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>);
export const UserCircle = makeIcon(<><circle cx="12" cy="12" r="10" /><circle cx="12" cy="10" r="3" /><path d="M7 20a6 6 0 0 1 10 0" /></>);
export const UserRound = UserCircle;

export const Mail = makeIcon(<><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></>);
export const Archive = makeIcon(<><rect width="20" height="5" x="2" y="3" rx="1" /><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" /><path d="M10 12h4" /></>);
export const Instagram = makeIcon(<><rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></>);
export const Clipboard = makeIcon(<><rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /></>);
export const ExternalLink = makeIcon(<><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></>);
export const Eye = makeIcon(<><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>);
export const EyeOff = makeIcon(<><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" y1="2" x2="22" y2="22" /></>);
export const Phone = makeIcon(<><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></>);
export const PhoneMissed = makeIcon(<><line x1="22" y1="2" x2="16" y2="8" /><line x1="16" y1="2" x2="22" y2="8" /><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></>);
export const PhoneCall = makeIcon(<><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /><path d="M14.05 2a9 9 0 0 1 8 7.94" /><path d="M14.05 6A5 5 0 0 1 18 10" /></>);
export const PhoneIncoming = makeIcon(<><polyline points="16 2 16 8 22 8" /><line x1="22" y1="2" x2="16" y2="8" /><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></>);
export const PhoneOutgoing = makeIcon(<><polyline points="22 8 22 2 16 2" /><line x1="16" y1="8" x2="22" y2="2" /><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></>);
export const X = makeIcon(<><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>);

// ─── Added icons ──────────────────────────────────────────────────────────────
export const Info = makeIcon(<><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></>);
export const AlertCircle = makeIcon(<><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>);
export const AlertTriangle = makeIcon(<><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></>);
export const Calendar = makeIcon(<><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" /></>);
export const CalendarPlus = makeIcon(<><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" /><path d="M12 14v4" /><path d="M10 16h4" /></>);
export const Bell = makeIcon(<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></>);
export const BellRing = makeIcon(<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /><path d="M4 2C2.8 3.7 2 5.7 2 8" /><path d="M22 8c0-2.3-.8-4.3-2-6" /></>);
