"use client";

import PageHeader from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, MessageSquarePlus } from "lucide-react";
import { useRouter } from "next/navigation";

export default function NewChatPage() {
  const router = useRouter();
  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="Start New Chat" />
      <main className="flex-grow p-6 flex flex-col items-center justify-center">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <MessageSquarePlus className="w-16 h-16 text-primary" />
            </div>
            <CardTitle className="text-2xl font-headline">New Chat Feature</CardTitle>
            <CardDescription className="text-muted-foreground">
              This section will allow you to start new conversations with your contacts or create new groups.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Currently, this feature is under development. Please check back later!
            </p>
            <Button onClick={() => router.push('/')} className="w-full">
              <Users className="mr-2 h-4 w-4" /> View Existing Chats
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
