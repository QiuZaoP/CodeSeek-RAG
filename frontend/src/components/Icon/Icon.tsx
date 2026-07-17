import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function IconBase({ children, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {children}
    </svg>
  )
}

export function FolderIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3.5 7.75V18a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2V8.75a2 2 0 0 0-2-2h-6.15l-1.8-2H5.5a2 2 0 0 0-2 2v1Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" />
    </IconBase>
  )
}

export function CheckIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m6.8 12.2 3.2 3.2 7.2-7.2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </IconBase>
  )
}

export function UserIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.75" />
      <path d="M5.5 19c.55-3.4 2.72-5.1 6.5-5.1s5.95 1.7 6.5 5.1" stroke="currentColor" strokeLinecap="round" strokeWidth="1.75" />
    </IconBase>
  )
}

export function BotIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="4.25" y="7" width="15.5" height="11.5" rx="3" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 4v3M8.25 12h.01M15.75 12h.01M9 15.25h6M2.5 11.5v3M21.5 11.5v3" stroke="currentColor" strokeLinecap="round" strokeWidth="1.75" />
    </IconBase>
  )
}

export function FileIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M7 3.75h6.25L18 8.5V20.25H7V3.75Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.75" />
      <path d="M13 3.75V8.5h5" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.75" />
    </IconBase>
  )
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m7 9.5 5 5 5-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" />
    </IconBase>
  )
}

export function AlertIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3.5 21 20H3L12 3.5Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.75" />
      <path d="M12 9v5M12 17.25h.01" stroke="currentColor" strokeLinecap="round" strokeWidth="1.9" />
    </IconBase>
  )
}
