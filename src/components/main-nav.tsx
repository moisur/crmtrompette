"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Users, Wallet, User, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"

const links = [
  { name: "Accueil", href: "/", icon: Home },
  { name: "Élèves", href: "/students", icon: Users },
  { name: "Agenda", href: "/agenda", icon: Calendar },
  { name: "Finances", href: "/finances", icon: Wallet },
  { name: "Profil", href: "/profile", icon: User },
]

export function MainNav() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center space-x-6">
      {links.map((link) => {
        const Icon = link.icon
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary",
              pathname === link.href ? "text-primary border-b-2 border-primary" : "text-muted-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{link.name}</span>
          </Link>
        )
      })}
    </nav>
  )
}
