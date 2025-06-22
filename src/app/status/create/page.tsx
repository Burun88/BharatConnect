
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { ImagePlus, Type, Video, Loader2 } from "lucide-react"; // Import Loader2
import { useAuth } from '@/contexts/AuthContext';
import SwipeablePageWrapper from '@/components/shared/SwipeablePageWrapper';
import { useToast } from '@/hooks/use-toast';

export default function CreateStatusPage() {
  const router = useRouter();
  const { isAuthenticated, isAuthLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      console.log(`[CreateStatusPage] Not authenticated, AuthContext should redirect.`);
    }
  }, [isAuthenticated, isAuthLoading, router]);

  const handleOptionClick = (option: 'text' | 'image' | 'video') => {
    if (option === 'text') {
      router.push('/status/create/text');
    } else {
      toast({
        title: `Create ${option} status`,
        description: `This feature (${option} status creation) is coming soon!`,
      });
    }
  };

  if (isAuthLoading) {
    return (
      <div className="flex flex-col h-[calc(var(--vh)*100)] bg-background items-center justify-center">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
        <p className="mt-4 text-muted-foreground text-center">Loading Status Creator...</p>
      </div>
    );
  }
  
  if (!isAuthenticated && !isAuthLoading) {
     return (
         <div className="flex flex-col h-[calc(var(--vh)*100)] bg-background items-center justify-center">
            <p className="text-muted-foreground text-center">Redirecting...</p>
         </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(var(--vh)*100)] bg-background">
      <PageHeader title="Create New Status" />
      <SwipeablePageWrapper className="flex-grow overflow-hidden">
        <main className="h-full flex flex-col items-center justify-center p-4 text-center overflow-auto">
          <Card className="w-full max-w-md shadow-xl rounded-2xl">
            <CardHeader className="items-center">
              <CardTitle className="text-2xl font-headline text-foreground">Choose Status Type</CardTitle>
              <CardDescription>Select how you want to share your update.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <Button
                variant="outline"
                className="w-full h-16 text-lg justify-start p-4 space-x-3 border-primary/30 hover:bg-primary/10"
                onClick={() => handleOptionClick('text')}
              >
                <Type className="w-7 h-7 text-primary" />
                <span>Create Text Status</span>
              </Button>
              <Button
                variant="outline"
                className="w-full h-16 text-lg justify-start p-4 space-x-3 border-accent/30 hover:bg-accent/10"
                onClick={() => handleOptionClick('image')}
              >
                <ImagePlus className="w-7 h-7 text-accent" />
                <span>Upload Image (Soon)</span>
              </Button>
              <Button
                variant="outline"
                className="w-full h-16 text-lg justify-start p-4 space-x-3 border-secondary/30 hover:bg-secondary/20"
                onClick={() => handleOptionClick('video')}
              >
                <Video className="w-7 h-7 text-secondary-foreground" />
                <span>Upload Video (Soon)</span>
              </Button>
            </CardContent>
            <CardFooter>
                <Button variant="ghost" onClick={() => router.back()} className="w-full text-muted-foreground">
                    Cancel
                </Button>
            </CardFooter>
          </Card>
        </main>
      </SwipeablePageWrapper>
    </div>
  );
}
