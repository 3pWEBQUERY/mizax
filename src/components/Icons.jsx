const base = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export const HomeIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M5 10.2 12 4.5l7 5.7V19a1 1 0 0 1-1 1h-4v-5.5h-4V20H6a1 1 0 0 1-1-1z" />
  </svg>
);
export const BackIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
);
export const PlusIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const MicIcon = (p) => (
  <svg {...base} {...p}>
    <rect x="9" y="3.5" width="6" height="11" rx="3" />
    <path d="M6 11.5a6 6 0 0 0 12 0M12 17.5V20.5" />
  </svg>
);
export const SendIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </svg>
);
export const CloseIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);
export const HeartIcon = ({ filled, ...p }) => (
  <svg {...base} width={18} height={18} fill={filled ? 'currentColor' : 'none'} {...p}>
    <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
  </svg>
);
export const CheckIcon = (p) => (
  <svg {...base} width={13} height={13} strokeWidth={2.6} {...p}>
    <path d="M5 12.5l4.2 4L19 7" />
  </svg>
);
export const PinIcon = (p) => (
  <svg {...base} width={14} height={14} {...p}>
    <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
    <circle cx="12" cy="10" r="2.3" />
  </svg>
);
export const PhoneIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z" />
  </svg>
);
export const ChatIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M4 18.5V6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H8z" />
  </svg>
);
export const MailIcon = (p) => (
  <svg {...base} {...p}>
    <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
    <path d="M4 7l8 6 8-6" />
  </svg>
);
export const ChevronL = (p) => (
  <svg {...base} {...p}>
    <path d="M14.5 5.5 8 12l6.5 6.5" />
  </svg>
);
export const ChevronR = (p) => (
  <svg {...base} {...p}>
    <path d="M9.5 5.5 16 12l-6.5 6.5" />
  </svg>
);
export const ArrowUp = (p) => (
  <svg {...base} width={16} height={16} {...p}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </svg>
);
export const TrashIcon = (p) => (
  <svg {...base} width={16} height={16} {...p}>
    <path d="M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13" />
  </svg>
);
export const SpinnerIcon = (p) => (
  <svg {...base} className="spin" {...p}>
    <path d="M12 3a9 9 0 1 0 9 9" />
  </svg>
);
export const SunIcon = (p) => (
  <svg {...base} width={20} height={20} {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
  </svg>
);
export const MoonIcon = (p) => (
  <svg {...base} width={20} height={20} {...p}>
    <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
  </svg>
);
export const UserIcon = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="8.5" r="3.8" />
    <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
  </svg>
);
export const SparkIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M12 3.5l2 5.5 5.5 2-5.5 2-2 5.5-2-5.5-5.5-2 5.5-2z" />
  </svg>
);
export const LockIcon = (p) => (
  <svg {...base} {...p}>
    <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
  </svg>
);
export const LogoutIcon = (p) => (
  <svg {...base} width={20} height={20} {...p}>
    <path d="M14 4.5h3.5a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H14M10 16l-4-4 4-4M6 12h10" />
  </svg>
);
export const EditIcon = (p) => (
  <svg {...base} width={20} height={20} {...p}>
    <path d="M4.5 19.5l1-4L16 5a2.1 2.1 0 0 1 3 3L8.5 18.5z" />
  </svg>
);
export const LoginIcon = (p) => (
  <svg {...base} width={20} height={20} {...p}>
    <path d="M10 4.5H6.5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2H10M14 16l4-4-4-4M18 12H8" />
  </svg>
);
