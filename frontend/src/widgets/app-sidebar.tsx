import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link, NavLink, matchPath, useLocation, useNavigate } from 'react-router-dom'
import * as Collapsible from '@radix-ui/react-collapsible'
import {
  Home,
  Puzzle,
  Wand2,
  Zap,
  BookOpen,
  ChevronRight,
  ChevronsUpDown,
  MessageSquare,
  Bot,
  Workflow,
  BadgeCheck,
  CreditCard,
  LogOut,
  PanelLeft,
  PanelLeftClose,
} from 'lucide-react'
import { useAuthStore } from '@entities/user'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@shared/ui/sidebar'
import { Avatar, AvatarFallback, AvatarImage } from '@shared/ui/avatar'

// -- Configuration & Data --

const mainNav = [
  {
    title: 'Platform',
    items: [
      {
        title: 'Home',
        url: '/home',
        icon: Home,
      },
      {
        title: 'Skills',
        url: '/skills',
        icon: Puzzle,
      },
    ],
  },
]

const toolsNav = [
  {
    title: 'AI Tools',
    icon: Wand2,
    url: '/ai-tools',
    items: [
      { title: 'Chat', url: '/ai-tools/chat', icon: MessageSquare },
      { title: 'Assistants', url: '/ai-tools/assistants', icon: Bot },
      { title: 'Automation', url: '/ai-tools/automation', icon: Workflow },
    ],
  },
]

const resourcesNav = [
  {
    title: 'Resources',
    items: [
      {
        title: 'Prompts Library',
        url: '/resources/prompts',
        icon: BookOpen,
        description: 'Browse collection',
      },
    ],
  },
]

// -- Helper Functions --

const isRouteActive = (pathname: string, target: string, end = true) => {
  return Boolean(matchPath({ path: target, end }, pathname))
}

// -- Component --

/**
 * Desktop/mobile sidebar: grouped nav links, profile menu, and an icon-only control to collapse the rail (streak lives on Home).
 */
export function AppSidebar() {
  const location = useLocation()
  const { toggleSidebar, state } = useSidebar()
  const isAiToolsActive = location.pathname.startsWith('/ai-tools')

  const collapseLabel =
    state === 'collapsed' ? 'Expand sidebar' : 'Collapse sidebar'

  return (
    <Sidebar variant="floating" collapsible="icon" className="border-none">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex min-w-0 w-full items-center gap-1">
              <SidebarMenuButton
                size="lg"
                asChild
                className="group min-w-0 flex-1 md:h-12 md:p-0"
              >
                <Link to="/home">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-xl bg-orange-500 text-white shadow-sm">
                    <Zap className="size-4" />
                  </div>
                  <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-bold">AppEx</span>
                    <span className="truncate text-xs text-muted-foreground">
                      Pro Plan
                    </span>
                  </div>
                </Link>
              </SidebarMenuButton>
              <SidebarMenuButton
                type="button"
                size="sm"
                title={collapseLabel}
                onClick={(e) => {
                  e.preventDefault()
                  toggleSidebar()
                }}
                tooltip={collapseLabel}
                aria-label={collapseLabel}
                className="text-muted-foreground hover:text-foreground size-9 shrink-0 !w-9 justify-center !p-0"
              >
                {state === 'collapsed' ? (
                  <PanelLeft className="size-4 shrink-0" aria-hidden />
                ) : (
                  <PanelLeftClose className="size-4 shrink-0" aria-hidden />
                )}
              </SidebarMenuButton>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="gap-0">
        {/* Main Platform */}
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav[0].items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isRouteActive(location.pathname, item.url)}
                    tooltip={item.title}
                  >
                    <NavLink to={item.url} end>
                      <item.icon />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* AI Tools (Collapsible) */}
        <SidebarGroup>
          <SidebarGroupLabel>Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <Collapsible.Root
                defaultOpen={isAiToolsActive}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <Collapsible.Trigger asChild>
                    <SidebarMenuButton tooltip="AI Tools" isActive={isAiToolsActive}>
                      <Wand2 />
                      <span>AI Tools</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </Collapsible.Trigger>
                  <Collapsible.Content>
                    <SidebarMenuSub>
                      {toolsNav[0].items.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={isRouteActive(
                              location.pathname,
                              subItem.url
                            )}
                          >
                            <NavLink to={subItem.url} end>
                              {subItem.icon && <subItem.icon className="size-4 opacity-70" />}
                              <span>{subItem.title}</span>
                            </NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </Collapsible.Content>
                </SidebarMenuItem>
              </Collapsible.Root>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Resources */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel>Library</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {resourcesNav[0].items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isRouteActive(location.pathname, item.url)}
                    tooltip={item.title}
                  >
                    <NavLink to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <ProfileDropdown />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

/**
 * Builds two-letter avatar initials from the user's name, or from the email local-part.
 */
function initialsFromProfile(name: string, email: string): string {
  const trimmed = name.trim()
  if (trimmed) {
    const parts = trimmed.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      return (parts[0]![0]! + parts[1]![0]!).toUpperCase()
    }
    return trimmed.slice(0, 2).toUpperCase()
  }
  const local = email.split('@')[0] ?? email
  return (local.slice(0, 2).toUpperCase() || '?')
}

/**
 * Prefer full name; before profile loads, fall back to email local-part or a neutral label.
 */
function displayNameFromUser(name: string | undefined, email: string): string {
  const n = name?.trim()
  if (n) return n
  if (email) return email.split('@')[0] ?? email
  return 'Account'
}

/** z-index above dialogs/sheets so the account menu stays readable over lesson content. */
const PROFILE_MENU_Z = 10050

function ProfileDropdown() {
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState<{ left: number; bottom: number }>({
    left: 0,
    bottom: 0,
  })
  const triggerRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)

  const email = user?.email ?? ''
  const displayName = displayNameFromUser(user?.name, email)
  const initials = initialsFromProfile(user?.name ?? '', email)
  const avatarUrl = user?.avatar_url?.trim()

  /**
   * Positions the floating menu above the trigger using fixed coordinates so it escapes sidebar stacking contexts.
   */
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return

    function updatePosition() {
      const el = triggerRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      setMenuPos({
        left: Math.max(8, r.left),
        bottom: Math.max(8, window.innerHeight - r.top + 8),
      })
    }

    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [open])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const t = e.target as Node
      if (
        triggerRef.current?.contains(t) ||
        menuRef.current?.contains(t)
      ) {
        return
      }
      setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSignOut() {
    setOpen(false)
    logout()
    navigate('/auth')
  }

  const menu = open ? (
    <div
      ref={menuRef}
      role="menu"
      style={{
        position: 'fixed',
        left: menuPos.left,
        bottom: menuPos.bottom,
        width: '14rem',
        zIndex: PROFILE_MENU_Z,
      }}
      className="rounded-xl border-2 border-border bg-popover text-popover-foreground shadow-2xl ring-2 ring-black/10 animate-in fade-in slide-in-from-bottom-2 duration-150 dark:ring-white/20"
    >
      <div className="flex items-center gap-3 border-b border-border px-3 py-3">
        <Avatar className="size-9 rounded-lg">
          {avatarUrl ? (
            <AvatarImage src={avatarUrl} alt={displayName} />
          ) : null}
          <AvatarFallback className="rounded-lg bg-primary/15 text-primary font-medium text-sm">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="grid min-w-0 text-sm leading-tight">
          <span className="truncate font-semibold">{displayName}</span>
          <span className="truncate text-xs text-muted-foreground">
            {email || '—'}
          </span>
        </div>
      </div>

      <div className="p-1.5">
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            navigate('/settings?section=account')
          }}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted"
        >
          <BadgeCheck className="size-4 text-muted-foreground" />
          <span>Account</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            navigate('/settings?section=billing')
          }}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted"
        >
          <CreditCard className="size-4 text-muted-foreground" />
          <span>Billing</span>
        </button>
      </div>

      <div className="border-t p-1.5">
        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted"
        >
          <LogOut className="size-4 text-muted-foreground" />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  ) : null

  return (
    <div ref={triggerRef} className="relative">
      <SidebarMenuButton
        size="lg"
        className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        onClick={() => setOpen(!open)}
        data-state={open ? 'open' : 'closed'}
      >
        <Avatar className="size-8 rounded-lg">
          {avatarUrl ? (
            <AvatarImage src={avatarUrl} alt={displayName} />
          ) : null}
          <AvatarFallback className="rounded-lg bg-primary/15 text-primary font-medium text-xs">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="grid flex-1 text-left text-sm leading-tight">
          <span className="truncate font-semibold">{displayName}</span>
          <span className="truncate text-xs text-muted-foreground">
            {email || '—'}
          </span>
        </div>
        <ChevronsUpDown className="ml-auto size-4" />
      </SidebarMenuButton>

      {typeof document !== 'undefined' && menu
        ? createPortal(menu, document.body)
        : null}
    </div>
  )
}
