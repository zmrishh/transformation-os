"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export function Nav() {
  const pathname = usePathname()

  const links = [
    { href: "/", label: "Dashboard" },
    { href: "/training", label: "Training" },
    { href: "/vault", label: "Vault" },
  ]

  return (
    <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-8 py-5">
      <span className="text-sm font-medium tracking-[0.08em] text-foreground/50 uppercase select-none">
        OS
      </span>

      <div className="flex items-center gap-1 rounded-full border border-border bg-card/60 px-1.5 py-1 backdrop-blur-md">
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200",
              pathname === href
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="w-8" aria-hidden />
    </nav>
  )
}
