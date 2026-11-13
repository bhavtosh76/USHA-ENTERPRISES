"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  CalendarCheck,
  ChevronDown,
  ClipboardList,
  Contact,
  FileBarChart,
  Inbox,
  LayoutDashboard,
  Landmark,
  LogOut,
  Menu,
  Network,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  Users,
  Wallet,
  Wrench,
  X,
} from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { BrandLogo } from "@/components/brand-logo";

export type NavItem = {
  label: string;
  href: string;
  icon: keyof typeof ICONS;
  permission?: string;
  badge?: number;
};

const ICONS = {
  dashboard: LayoutDashboard,
  customers: Contact,
  enquiries: Inbox,
  staff: Users,
  org: Network,
  attendance: CalendarCheck,
  payroll: Wallet,
  installations: Wrench,
  finance: Landmark,
  subsidy: Sun,
  reports: FileBarChart,
  settings: Settings,
  audit: ShieldCheck,
  profile: ClipboardList,
};

const SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", href: "/app", icon: "dashboard" }],
  },
  {
    title: "Operations",
    items: [
      { label: "Customers (CRM)", href: "/app/customers", icon: "customers", permission: "customer.view" },
      { label: "Enquiries", href: "/app/enquiries", icon: "enquiries", permission: "customer.view" },
      { label: "Installations", href: "/app/installations", icon: "installations", permission: "installation.view" },
      { label: "Staff", href: "/app/staff", icon: "staff", permission: "staff.view" },
      { label: "Organisation Tree", href: "/app/org", icon: "org", permission: "staff.view" },
      { label: "Attendance", href: "/app/attendance", icon: "attendance", permission: "attendance.view" },
      { label: "Payroll", href: "/app/payroll", icon: "payroll", permission: "payroll.view" },
    ],
  },
  {
    title: "Business",
    items: [
      { label: "Finance", href: "/app/finance", icon: "finance", permission: "finance.view" },
      { label: "Subsidy Schemes", href: "/app/subsidy-schemes", icon: "subsidy", permission: "subsidy.view" },
      { label: "Reports", href: "/app/reports", icon: "reports", permission: "reports.view" },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Users & Roles", href: "/app/settings", icon: "settings", permission: "settings.manage" },
      { label: "Audit Logs", href: "/app/audit", icon: "audit", permission: "audit.view" },
      { label: "My Profile", href: "/app/profile", icon: "profile" },
    ],
  },
];

export type ShellUser = {
  id: string;
  name: string;
  email: string;
  roleKey: string;
  roleName: string;
  permissions: string[];
  staffId: string | null;
  designation: string | null;
};

export type ShellNotification = {
  id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

function allowed(user: ShellUser, permission?: string) {
  if (!permission) return true;
  if (user.roleKey === "SUPER_ADMIN") return true;
  if (user.permissions.includes("*")) return true;
  return user.permissions.includes(permission);
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function AppShell({
  user,
  notifications,
  children,
}: {
  user: ShellUser;
  notifications: ShellNotification[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(notifications.filter((n) => !n.isRead).length);
  const [items, setItems] = useState(notifications);
  const [query, setQuery] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
    setBellOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const sections = useMemo(
    () =>
      SECTIONS.map((s) => ({ ...s, items: s.items.filter((i) => allowed(user, i.permission)) })).filter(
        (s) => s.items.length,
      ),
    [user],
  );

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function markAllRead() {
    setUnread(0);
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await fetch("/api/notifications/read-all", { method: "POST" });
    router.refresh();
  }

  const nav = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <BrandLogo size={38} priority />
        <div className="leading-tight">
          <p className="text-sm font-extrabold tracking-wide text-white">USHA ENTERPRISES</p>
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Solar ERP + CRM</p>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-6">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = ICONS[item.icon];
                const active =
                  item.href === "/app"
                    ? pathname === "/app"
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition",
                      active
                        ? "bg-white/10 text-white shadow-inner ring-1 ring-white/10"
                        : "text-slate-300 hover:bg-white/5 hover:text-white",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        active ? "text-solar-400" : "text-slate-400 group-hover:text-slate-200",
                      )}
                    />
                    <span className="truncate">{item.label}</span>
                    {active ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-solar-400" /> : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-400 hover:bg-white/5 hover:text-white"
        >
          <Sun className="h-3.5 w-3.5" /> Public website
        </Link>
        <div className="mt-1 flex items-center gap-2 rounded-lg px-2 py-2">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-solar-600 text-xs font-bold text-white">
            {initials(user.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-white">{user.name}</p>
            <p className="truncate text-[10px] text-slate-400">{user.roleName}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-sand">
      <aside className="no-print fixed inset-y-0 left-0 z-40 hidden w-64 bg-navy-950 lg:block">{nav}</aside>

      {open ? (
        <div className="no-print fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-navy-950 shadow-pop">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-4 rounded-md p-1.5 text-slate-300 hover:bg-white/10"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
            {nav}
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-64">
        <header className="no-print sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
          <button
            onClick={() => setOpen(true)}
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <form
            action="/app/customers"
            className="relative hidden max-w-md flex-1 items-center sm:flex"
          >
            <Search className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400" />
            <input
              name="q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search customer, mobile, village, code…"
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition focus:border-solar-400 focus:bg-white focus:ring-2 focus:ring-solar-500/15"
            />
          </form>

          <div className="ml-auto flex items-center gap-1.5">
            <div className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200 md:flex">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              Live
            </div>

            <div className="relative" ref={bellRef}>
              <button
                onClick={() => setBellOpen((v) => !v)}
                className="relative grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100"
                aria-label="Notifications"
              >
                <Bell className="h-4.5 w-4.5" />
                {unread > 0 ? (
                  <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                ) : null}
              </button>
              {bellOpen ? (
                <div className="absolute right-0 top-11 w-[min(90vw,380px)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-pop">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <p className="text-sm font-bold text-navy-900">Notifications</p>
                    <button onClick={markAllRead} className="text-[11px] font-semibold text-solar-700 hover:underline">
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {items.length === 0 ? (
                      <p className="px-4 py-8 text-center text-xs text-slate-500">No notifications yet.</p>
                    ) : (
                      items.slice(0, 12).map((n) => (
                        <Link
                          key={n.id}
                          href={n.link || "/app/notifications"}
                          className={cn(
                            "block border-b border-slate-50 px-4 py-3 text-left hover:bg-slate-50",
                            !n.isRead && "bg-solar-50/50",
                          )}
                        >
                          <div className="flex items-start gap-2">
                            <span
                              className={cn(
                                "mt-1 h-1.5 w-1.5 shrink-0 rounded-full",
                                n.type === "DANGER"
                                  ? "bg-rose-500"
                                  : n.type === "WARNING"
                                    ? "bg-amber-500"
                                    : n.type === "SUCCESS"
                                      ? "bg-emerald-500"
                                      : "bg-sky-500",
                              )}
                            />
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-slate-800">{n.title}</p>
                              <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">{n.message}</p>
                              <p className="mt-1 text-[10px] text-slate-400">{timeAgo(n.createdAt)}</p>
                            </div>
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                  <Link
                    href="/app/notifications"
                    className="block border-t border-slate-100 px-4 py-2.5 text-center text-[11px] font-semibold text-navy-700 hover:bg-slate-50"
                  >
                    View all notifications
                  </Link>
                </div>
              ) : null}
            </div>

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 hover:bg-slate-100"
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-navy-900 text-xs font-bold text-white">
                  {initials(user.name)}
                </span>
                <span className="hidden text-left leading-tight sm:block">
                  <span className="block max-w-[120px] truncate text-xs font-semibold text-slate-800">{user.name}</span>
                  <span className="block text-[10px] text-slate-500">{user.roleName}</span>
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>
              {menuOpen ? (
                <div className="absolute right-0 top-11 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-pop">
                  <div className="border-b border-slate-100 px-3 py-2">
                    <p className="truncate text-xs font-semibold text-slate-800">{user.email}</p>
                    <p className="text-[10px] text-slate-500">{user.designation || user.roleName}</p>
                  </div>
                  <Link href="/app/profile" className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">
                    <ClipboardList className="h-3.5 w-3.5" /> My profile
                  </Link>
                  <Link href="/app/notifications" className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">
                    <Bell className="h-3.5 w-3.5" /> Notifications
                  </Link>
                  <button
                    onClick={logout}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-rose-600 hover:bg-rose-50"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Sign out
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
