
"use client";

import type { FC } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Logo from '@/components/shared/Logo';
import { Search, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { signOutUser } from '@/lib/firebase';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { LocalUserProfile } from '@/types';

interface HomeHeaderProps {
  isHeaderContentLoaded: boolean;
}

const HomeHeader: FC<HomeHeaderProps> = ({ isHeaderContentLoaded }) => {
  const { toast } = useToast();
  const router = useRouter();
  const [, setUserProfileLs] = useLocalStorage<LocalUserProfile | null>('userProfile', null);


  const showComingSoonToast = () => {
    toast({
      title: "Hold Tight, Connecting Soon! 🚀",
      description: "Our team is busy crafting this awesome feature for you. It'll be ready before your next chai break! Stay tuned with BharatConnect! 🇮🇳✨",
    });
  };

  const handleLogout = async () => {
    try {
      await signOutUser();
      setUserProfileLs(null); // Clear local storage profile
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      router.replace('/login'); // Redirect to login page
    } catch (error: any) {
      console.error("Error logging out:", error);
      toast({
        variant: "destructive",
        title: "Logout Failed",
        description: error.message || "An unexpected error occurred during logout.",
      });
    }
  };

  return (
    <header
      className={cn(
        "flex items-center justify-between p-4 bg-background z-20 h-16",
        "fixed top-0 left-0 right-0",
        "transition-transform duration-300 ease-in-out",
        isHeaderContentLoaded ? "translate-y-0" : "-translate-y-full"
      )}
    >
      <Logo
        size="medium"
        className={cn(
          "transition-all duration-300 ease-in-out"
        )}
      />
      <div
        className={cn(
          "flex items-center space-x-2 transition-all duration-300 ease-in-out"
        )}
      >
        <Button 
          variant="ghost" 
          size="icon" 
          aria-label="Search" 
          tabIndex={isHeaderContentLoaded ? 0 : -1}
          onClick={showComingSoonToast}
        >
          <Search className="w-5 h-5" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          aria-label="Logout" 
          tabIndex={isHeaderContentLoaded ? 0 : -1}
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );
};

export default HomeHeader;
