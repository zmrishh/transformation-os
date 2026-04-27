"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export function Nav() {
  const pathname = usePathname()

  const links = [
    { href: "/",         label: "Dashboard" },
    { href: "/training", label: "Training"  },
    { href: "/vault",    label: "Vault"     },
    { href: "/journal",  label: "Journal"   },
  ]

  return (
    <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-4 py-4 sm:px-8 sm:py-5">
      <span className="text-sm font-medium tracking-[0.08em] text-foreground/50 uppercase select-none">
        OS
      </span>

      <div className="flex items-center gap-0.5 rounded-full border border-border bg-card/60 px-1 py-1 backdrop-blur-md overflow-hidden">
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "rounded-full px-3 py-2 text-sm font-medium transition-all duration-200",
              "min-h-[36px] flex items-center",
              "sm:px-4 sm:py-1.5",
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
