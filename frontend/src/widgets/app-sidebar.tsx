import { useState, useRef, useEffect } from 'react'
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
import { StreakSheet } from '@features/streak'

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

export function AppSidebar() {
  const location = useLocation()
  const [streakOpen, setStreakOpen] = useState(false)
  // Initialize sidebar context for this component tree.
  useSidebar()
  const isAiToolsActive = location.pathname.startsWith('/ai-tools')

  return (
    <Sidebar variant="floating" collapsible="icon" className="border-none">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              className="md:h-12 md:p-0 group"
            >
              <Link to="/home">
                <div className="flex aspect-square size-8 items-center justify-center rounded-xl bg-orange-500 text-white shadow-sm">
                  <Zap className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-bold">AppEx</span>
                  <span className="truncate text-xs text-muted-foreground">
                    Pro Plan
                  </span>
                </div>
                <div
                  role="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setStreakOpen(true)
                  }}
                  className={`
                    inline-flex items-center gap-1.5 rounded-full px-3 py-1
                    text-sm font-semibold text-orange-700
                    bg-linear-to-r from-orange-100 to-amber-100
                    ring-1 ring-orange-200/80 shadow-sm
                    transition-all duration-200
                    hover:shadow-md hover:ring-orange-300/80 hover:scale-[1.03]
                    active:scale-95
                  `}
                >
                  <span className="tabular-nums">1</span>
                  <span className="text-sm transition-transform duration-200 hover:-rotate-12 hover:scale-110">
                    🔥
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Streak sheet popup */}
      <StreakSheet open={streakOpen} onOpenChange={setStreakOpen} />

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

function ProfileDropdown() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSignOut() {
    setOpen(false)
    logout()
    navigate('/auth')
  }

  return (
    <div ref={ref} className="relative">
      <SidebarMenuButton
        size="lg"
        className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        onClick={() => setOpen(!open)}
        data-state={open ? 'open' : 'closed'}
      >
        <Avatar className="size-8 rounded-lg">
          <AvatarImage src="/avatars/user.png" alt="Yera" />
          <AvatarFallback className="rounded-lg bg-orange-100 text-orange-600 font-medium">
            YE
          </AvatarFallback>
        </Avatar>
        <div className="grid flex-1 text-left text-sm leading-tight">
          <span className="truncate font-semibold">Yera</span>
          <span className="truncate text-xs text-muted-foreground">
            botawatfat@gmail.com
          </span>
        </div>
        <ChevronsUpDown className="ml-auto size-4" />
      </SidebarMenuButton>

      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-56 rounded-xl border bg-background shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-150">
          {/* User info header */}
          <div className="flex items-center gap-3 border-b px-3 py-3">
            <Avatar className="size-9 rounded-lg">
              <AvatarImage src="/avatars/user.png" alt="Yera" />
              <AvatarFallback className="rounded-lg bg-orange-100 text-orange-600 font-medium">
                YE
              </AvatarFallback>
            </Avatar>
            <div className="grid text-sm leading-tight">
              <span className="font-semibold">Yera</span>
              <span className="text-xs text-muted-foreground">
                botawatfat@gmail.com
              </span>
            </div>
          </div>

          {/* Menu items */}
          <div className="p-1.5">
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                navigate('/settings')
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
                navigate('/settings')
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted"
            >
              <CreditCard className="size-4 text-muted-foreground" />
              <span>Billing</span>
            </button>
          </div>

          {/* Sign out */}
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
      )}
    </div>
  )
}
