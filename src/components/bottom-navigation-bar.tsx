
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessagesSquare, Zap, PhoneCall, UserCircle } from 'lucide-react'; // Updated imports
import { cn } from '@/lib/utils';

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
};

const navItems: NavItem[] = [
  { href: '/', label: 'Chats', icon: MessagesSquare }, // Updated icon
  { href: '/status', label: 'Status', icon: Zap },         // Updated icon
  { href: '/calls', label: 'Calls', icon: PhoneCall },     // Updated icon
  { href: '/account', label: 'Account', icon: UserCircle }, // Updated icon
];

export default function BottomNavigationBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-background border-t border-border shadow- ऊपर md:hidden">
      <div className="flex justify-around items-center h-full max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = (pathname === '/' && item.href === '/') || 
                           (item.href !== '/' && pathname.startsWith(item.href)) ||
                           (pathname === '/account' && item.href === '/account');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full text-muted-foreground hover:text-primary transition-colors",
                isActive && "text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <item.icon className={cn("w-6 h-6 mb-0.5", isActive ? "" : "")} /> {/* Removed fill for active, gradient text handles icon color */}
              <span className={cn(isActive ? "text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary" : "text-xs")}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
