
"use client";

import * from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from '@/lib/utils';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  onClose?: () => void;
}

const STANDARD_EMOJIS = [
  '😊', '😂', '❤️', '👍', '🙏', '🎉', '🤔', '😢', '🔥', '💯',
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😇', '😉', '😌',
  '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😜', '🤪',
  '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔',
  '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😭',
  '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨',
  '😰', '😥', '😓', '🤗', ' THINKING_FACE', '🤭', '🤫', '🤥', '😶', '😐',
  '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴',
  '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒',
  '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻',
  '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻',
  '😼', '😽', '🙀', '😿', '😾',
];

// Mock data for Bharat and Recent emojis - will be replaced with actual data later
const BHARAT_EMOJIS: {id: string, name: string, character?: string, imageUrl?: string}[] = [
    // Example: { id: 'namaste', name: 'Namaste', imageUrl: '/emojis/bharat/namaste.png' }
];
const RECENT_EMOJIS: string[] = [];


export default function EmojiPicker({ onEmojiSelect, onClose }: EmojiPickerProps) {
  const handleSelect = (emoji: string) => {
    onEmojiSelect(emoji);
    // Optionally close picker after selection, depending on UX preference
    // if (onClose) onClose(); 
  };

  return (
    <div className="w-full max-w-xs sm:max-w-sm md:max-w-md rounded-lg bg-background p-0 border-none shadow-xl">
      <Tabs defaultValue="emoji" className="w-full">
        <TabsList className="grid w-full grid-cols-3 rounded-t-lg rounded-b-none">
          <TabsTrigger value="emoji" className="rounded-tl-lg">😊 Emoji</TabsTrigger>
          <TabsTrigger value="bharat">🇮🇳 Bharat</TabsTrigger>
          <TabsTrigger value="recent" className="rounded-tr-lg">💾 Recent</TabsTrigger>
        </TabsList>
        
        <TabsContent value="emoji" className="mt-0 p-0">
          <ScrollArea className="h-[250px] w-full p-3">
            <div className="grid grid-cols-8 gap-1">
              {STANDARD_EMOJIS.map((emoji, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  size="icon"
                  className="text-2xl aspect-square hover:bg-accent/50"
                  onClick={() => handleSelect(emoji)}
                  aria-label={`Select emoji ${emoji}`}
                >
                  {emoji}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
        
        <TabsContent value="bharat" className="mt-0 p-3 h-[250px] flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="text-2xl mb-2">🇮🇳</p>
            <p className="font-semibold">Bharat Emojis</p>
            <p className="text-xs">Coming Soon!</p>
          </div>
        </TabsContent>
        
        <TabsContent value="recent" className="mt-0 p-3 h-[250px] flex items-center justify-center">
           <div className="text-center text-muted-foreground">
            <p className="text-2xl mb-2">💾</p>
            <p className="font-semibold">Recently Used</p>
            <p className="text-xs">Coming Soon!</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
