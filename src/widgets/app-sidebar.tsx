import * as React from 'react'
import { Link, NavLink, matchPath, useLocation } from 'react-router-dom'
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
} from 'lucide-react'
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
        url: '/resources/prompts/collection',
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
                  className={`
                    inline-flex items-center gap-1.5 rounded-full px-3 py-1
                    text-sm font-semibold text-orange-700
                    bg-linear-to-r from-orange-100 to-amber-100
                    ring-1 ring-orange-200/80 shadow-sm
                    transition-all duration-200
                    group-hover:shadow-md group-hover:ring-orange-300/80 group-hover:scale-[1.03]
                    active:scale-95
                  `}
                >
                  <span className="tabular-nums">1</span>
                  <span className="text-sm transition-transform duration-200 group-hover:-rotate-12 group-hover:scale-110">
                    🔥
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
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
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              asChild
            >
              <Link to="/settings">
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
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
