"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageCircle, CircleDot, Phone, Users } from 'lucide-react'; // Added Users for Contacts
import { cn } from '@/lib/utils';

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
};

const navItems: NavItem[] = [
  { href: '/', label: 'Chats', icon: MessageCircle },
  { href: '/status', label: 'Status', icon: CircleDot },
  // { href: '/contacts', label: 'Contacts', icon: Users }, // Optional Contacts tab
  { href: '/calls', label: 'Calls', icon: Phone },
];

export default function BottomNavigationBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-background border-t border-border shadow- ऊपर md:hidden">
      <div className="flex justify-around items-center h-full max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = (pathname === '/' && item.href === '/') || (pathname !== '/' && item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} legacyBehavior>
              <a
                className={cn(
                  "flex flex-col items-center justify-center w-full h-full text-muted-foreground hover:text-primary transition-colors",
                  isActive && "text-primary"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <item.icon className={cn("w-6 h-6 mb-0.5", isActive ? "fill-primary/20" : "")} />
                <span className="text-xs">{item.label}</span>
              </a>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
