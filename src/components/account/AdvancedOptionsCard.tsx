
"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Download, Trash2, Settings2 } from 'lucide-react'; // Using Settings2 for main icon

export default function AdvancedOptionsCard() {
  return (
    <Card className="rounded-2xl shadow-md bg-card">
      <CardHeader>
        <div className="flex items-center">
          <Settings2 className="w-5 h-5 mr-2 text-primary" />
          <CardTitle className="text-lg">Advanced Options</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start"
                disabled
              >
                <Download className="w-4 h-4 mr-2" />
                Download My Data
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>This feature is coming soon!</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="destructive"
                className="w-full justify-start bg-destructive/20 hover:bg-destructive/30 border border-destructive/50 text-destructive"
                disabled
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete My Account
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>This feature is coming soon!</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <p className="text-xs text-muted-foreground pt-2">
          Account deletion is permanent and cannot be undone.
        </p>
      </CardContent>
    </Card>
  );
}
