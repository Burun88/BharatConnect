
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessagesSquare, Clapperboard, PhoneCall, UserCircle, Search as SearchIcon } from 'lucide-react'; // Changed Image to Clapperboard, Added SearchIcon
import { cn } from '@/lib/utils';

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
};

// Export navItems to be used by swipe navigation logic and other components
export const navItems: NavItem[] = [
  { href: '/', label: 'Chats', icon: MessagesSquare },
  { href: '/search', label: 'Search', icon: SearchIcon }, // New Search Tab
  { href: '/status', label: 'Status', icon: Clapperboard },
  { href: '/calls', label: 'Calls', icon: PhoneCall },
  { href: '/account', label: 'Account', icon: UserCircle },
];

export default function BottomNavigationBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-background border-t border-border shadow- ऊपर">
      <div className="flex justify-around items-center h-full max-w-md mx-auto">
        {navItems.map((item) => {
          // More specific active check for search page
          const isActive = (pathname === '/' && item.href === '/') ||
                           (item.href !== '/' && pathname.startsWith(item.href)) ||
                           (pathname === item.href); // Ensure '/search' matches exactly for search
                           
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full transition-colors"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <item.icon 
                className={cn(
                  "w-6 h-6 mb-0.5", 
                  isActive ? "text-primary" : "text-muted-foreground hover:text-primary"
                )} 
              />
              <span 
                className={cn(
                  "text-xs", 
                  isActive ? "text-primary" : "text-muted-foreground hover:text-primary"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
