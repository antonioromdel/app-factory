import {
  BookOpen,
  Image as ImageIcon,
  LayoutDashboard,
  ListChecks,
  Rocket,
  Settings,
  Smartphone,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  end?: boolean
}

export interface Breadcrumb {
  label: string
  to?: string
}

export const navigation: NavItem[] = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard, end: true },
  { label: 'Applications', to: '/applications', icon: Smartphone },
  { label: 'Knowledge', to: '/knowledge', icon: BookOpen },
  { label: 'Checklists', to: '/checklists', icon: ListChecks },
  { label: 'Assets', to: '/assets', icon: ImageIcon },
  { label: 'Releases', to: '/releases', icon: Rocket },
  { label: 'Settings', to: '/settings', icon: Settings },
]

export function findNavItem(pathname: string): NavItem | undefined {
  return navigation.find((item) =>
    item.to === '/' ? pathname === '/' : pathname.startsWith(item.to),
  )
}
