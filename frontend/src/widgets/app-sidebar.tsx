import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link, NavLink, matchPath, useLocation, useNavigate } from 'react-router-dom'
import {
  Home,
  Puzzle,
  Wand2,
  BookOpen,
  ChevronRight,
  ChevronsUpDown,
  BadgeCheck,
  CreditCard,
  LogOut,
  PanelLeft,
  PanelLeftClose,
  Sparkles,
  ClipboardCheck,
} from 'lucide-react'
import { useAuthStore } from '@entities/user'
import {
  useSubscriptionSummary,
  type SubscriptionTier,
} from '@entities/subscription'
import { cn } from '@shared/lib'
import { Logo } from '@shared/ui/logo'
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
      {
        title: 'Submissions',
        url: '/submissions',
        icon: ClipboardCheck,
      },
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
  const subscription = useSubscriptionSummary()

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
                  <div className="grid min-w-0 flex-1 text-left leading-tight">
                    <Logo className="truncate text-lg" />
                    <span
                      className="truncate text-xs text-muted-foreground"
                      title={subscription.planLabel}
                    >
                      {subscription.isLoading ? '…' : subscription.planLabel}
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

        {/* AI Tools — single working tool (Chat), so link straight to it. */}
        <SidebarGroup>
          <SidebarGroupLabel>Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="AI Chat"
                  isActive={isAiToolsActive}
                >
                  <NavLink to="/ai-tools/chat">
                    <Wand2 />
                    <span>AI Chat</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
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
          {/* Free / pending users get an upsell row above the profile button. */}
          {subscription.tier !== 'premium' && !subscription.isLoading && (
            <SidebarMenuItem>
              <UpgradeCta tier={subscription.tier} />
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <ProfileDropdown />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

/**
 * Compact "Premium"/"Free" pill — small enough to sit inline next to a name
 * or email. Hidden on icon-collapsed sidebars by the parent layout.
 */
function TierBadge({ tier }: { tier: SubscriptionTier }) {
  const cfg =
    tier === 'premium'
      ? {
          text: 'Premium',
          className:
            'bg-linear-to-r from-amber-400/20 to-orange-500/20 text-orange-700 ring-orange-500/30 dark:from-amber-400/15 dark:to-orange-500/15 dark:text-orange-300 dark:ring-orange-400/30',
          icon: Sparkles,
        }
      : tier === 'pending'
      ? {
          text: 'Pending',
          className:
            'bg-amber-100 text-amber-900 ring-amber-300 dark:bg-amber-900/30 dark:text-amber-200 dark:ring-amber-700/50',
          icon: null,
        }
      : {
          text: 'Free',
          className:
            'bg-muted text-muted-foreground ring-border',
          icon: null,
        }
  const Icon = cfg.icon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1',
        cfg.className
      )}
    >
      {Icon ? <Icon className="size-2.5" /> : null}
      {cfg.text}
    </span>
  )
}

/**
 * Sidebar upsell shown to non-premium users above their profile button.
 * Auto-hides on icon-collapsed sidebars to avoid a wide pill in a narrow rail.
 *
 * `pending` users (incomplete 3DS) see a simple "Finish payment" prompt.
 * Free users get the time-limited intro-offer banner with a countdown timer —
 * the timer creates urgency that lifts conversion (Jobescape-style upsell).
 */
function UpgradeCta({ tier }: { tier: SubscriptionTier }) {
  const { state } = useSidebar()
  if (state === 'collapsed') return null

  if (tier === 'pending') {
    return (
      <Link
        to="/settings?section=plan"
        className={cn(
          'group relative flex w-full items-start gap-2.5 overflow-hidden rounded-xl p-2.5 text-left transition-all',
          'bg-amber-50 ring-1 ring-amber-300 hover:bg-amber-100',
          'dark:bg-amber-950/30 dark:ring-amber-700/50 dark:hover:bg-amber-950/50'
        )}
      >
        <div className="flex aspect-square size-7 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white shadow-sm">
          <Sparkles className="size-3.5" />
        </div>
        <div className="min-w-0 flex-1 text-xs leading-tight">
          <p className="truncate font-semibold text-foreground">Finish payment</p>
          <p className="truncate text-[11px] text-muted-foreground">
            Complete 3D Secure to activate
          </p>
        </div>
        <ChevronRight className="mt-1 size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </Link>
    )
  }

  return <UpgradePremiumCta />
}

/**
 * Honest upgrade prompt for free users — highlights the value of Premium and links
 * to the plans page. No fake countdown or manufactured scarcity.
 */
function UpgradePremiumCta() {
  return (
    <Link
      to="/settings?section=plan"
      className={cn(
        'group block w-full overflow-hidden rounded-2xl p-3 text-left transition-all',
        'bg-linear-to-br from-amber-100 via-orange-100 to-orange-50',
        'ring-1 ring-orange-200 hover:ring-orange-300 hover:shadow-sm',
        'dark:from-amber-950/40 dark:via-orange-950/40 dark:to-orange-950/30 dark:ring-orange-900/60'
      )}
      aria-label="Upgrade to Premium. Open plans."
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-sm font-bold text-foreground">
          <Sparkles className="size-4 text-orange-500" aria-hidden />
          Upgrade to Premium
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>
      <p className="mt-1.5 text-xs leading-snug text-muted-foreground">
        Unlock every course, lesson, and AI tool.
      </p>
    </Link>
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

type ProfileMenuItemProps = {
  icon: React.ElementType
  label: string
  onClick: () => void
  iconClassName?: string
}

/**
 * One actionable row in the profile dropdown — keeps icons aligned and lets long labels wrap without shifting.
 */
function ProfileMenuItem({
  icon: Icon,
  label,
  onClick,
  iconClassName,
}: ProfileMenuItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
    >
      <Icon className={cn('size-4 shrink-0 text-muted-foreground', iconClassName)} />
      <span className="min-w-0 leading-snug">{label}</span>
    </button>
  )
}

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
  const subscription = useSubscriptionSummary()

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
        width: '16rem',
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
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="truncate font-semibold">{displayName}</span>
            {!subscription.isLoading && (
              <TierBadge tier={subscription.tier} />
            )}
          </div>
          <span className="truncate text-xs text-muted-foreground">
            {email || '—'}
          </span>
        </div>
      </div>

      <div className="p-1.5">
        <ProfileMenuItem
          icon={BadgeCheck}
          label="Account"
          onClick={() => {
            setOpen(false)
            navigate('/settings?section=account')
          }}
        />
        <ProfileMenuItem
          icon={subscription.tier === 'premium' ? CreditCard : Sparkles}
          label={
            subscription.tier === 'premium'
              ? 'Subscription management'
              : 'Upgrade to Premium'
          }
          iconClassName={
            subscription.tier === 'premium' ? undefined : 'text-orange-500'
          }
          onClick={() => {
            setOpen(false)
            navigate('/settings?section=plan')
          }}
        />
        <ProfileMenuItem
          icon={CreditCard}
          label="Billing history"
          onClick={() => {
            setOpen(false)
            navigate('/settings?section=billing')
          }}
        />
      </div>

      <div className="border-t p-1.5">
        <ProfileMenuItem icon={LogOut} label="Sign out" onClick={handleSignOut} />
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
