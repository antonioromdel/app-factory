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

export type NavId =
  | 'dashboard'
  | 'applications'
  | 'knowledge'
  | 'checklists'
  | 'assets'
  | 'releases'
  | 'settings'

export interface NavItem {
  id: NavId
  to: string
  icon: LucideIcon
  end?: boolean
}

export interface Breadcrumb {
  label: string
  to?: string
}

export const navigation: NavItem[] = [
  { id: 'dashboard', to: '/', icon: LayoutDashboard, end: true },
  { id: 'applications', to: '/applications', icon: Smartphone },
  { id: 'knowledge', to: '/knowledge', icon: BookOpen },
  { id: 'checklists', to: '/checklists', icon: ListChecks },
  { id: 'assets', to: '/assets', icon: ImageIcon },
  { id: 'releases', to: '/releases', icon: Rocket },
  { id: 'settings', to: '/settings', icon: Settings },
]

export function findNavItem(pathname: string): NavItem | undefined {
  return navigation.find((item) =>
    item.to === '/' ? pathname === '/' : pathname.startsWith(item.to),
  )
}
