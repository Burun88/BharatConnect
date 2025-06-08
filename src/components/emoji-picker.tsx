
"use client";

import * as React from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from '@/lib/utils';
import { Clock, Smile, Dog, Utensils, Car, Lightbulb } from 'lucide-react'; // Example icons

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
  '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐',
  '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴',
  '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒',
  '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻',
  '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻',
  '😼', '😽', '🙀', '😿', '😾', '👋', '🤚', '🖐️', '✋', '🖖',
  '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉',
  '👆', '🖕', '👇', '☝️', '✍️', '🤳', '💪', '🦾', '🦵', '🦿',
  '🦶', '👂', '🦻', '👃', '🧠', '🦷', '🦴', '👀', '👁️', '👅',
  '👄', '👶', '🧒', '👦', '👧', '🧑', '👱', '👨', '🧔', '👨‍🦰',
  '👨‍🦱', '👨‍🦳', '👨‍🦲', '👩', '👩‍🦰', '🧑‍🦰', '👩‍🦱', '🧑‍🦱', '👩‍🦳',
  '🧑‍🦳', '👩‍🦲', '🧑‍🦲', '👱‍♀️', '👱‍♂️', '🧓', '👴', '👵', '🙍',
  '🙍‍♂️', '🙍‍♀️', '🙎', '🙎‍♂️', '🙎‍♀️', '🙅', '🙅‍♂️', '🙅‍♀️', '🙆',
  '🙆‍♂️', '🙆‍♀️', '💁', '💁‍♂️', '💁‍♀️', '🙋', '🙋‍♂️', '🙋‍♀️', '🧏',
  '🧏‍♂️', '🧏‍♀️', '🙇', '🙇‍♂️', '🙇‍♀️', '🤦', '🤦‍♂️', '🤦‍♀️', '🤷',
  '🤷‍♂️', '🤷‍♀️', '🧑‍⚕️', '👨‍⚕️', '👩‍⚕️', '🧑‍🎓', '👨‍🎓', '👩‍🎓', '🧑‍🏫',
  '👨‍🏫', '👩‍🏫', '🧑‍⚖️', '👨‍⚖️', '👩‍⚖️', '🧑‍🌾', '👨‍🌾', '👩‍🌾', '🧑‍🍳',
  '👨‍🍳', '👩‍🍳', '🧑‍🔧', '👨‍🔧', '👩‍🔧', '🧑‍🏭', '👨‍🏭', '👩‍🏭', '🧑‍💼',
  '👨‍💼', '👩‍💼', '🧑‍🔬', '👨‍🔬', '👩‍🔬', '🧑‍💻', '👨‍💻', '👩‍💻', '🧑‍🎤',
  '👨‍🎤', '👩‍🎤', '🧑‍🎨', '👨‍🎨', '👩‍🎨', '🧑‍✈️', '👨‍✈️', '👩‍✈️', '🧑‍🚀',
  '👨‍🚀', '👩‍🚀', '🧑‍🚒', '👨‍🚒', '👩‍🚒', '👮', '👮‍♂️', '👮‍♀️', '🕵️',
];

// Mock data for Bharat and Recent emojis - will be replaced with actual data later
const BHARAT_EMOJIS: {id: string, name: string, character?: string, imageUrl?: string}[] = [
    // Example: { id: 'namaste', name: 'Namaste', imageUrl: '/emojis/bharat/namaste.png' }
];
const RECENT_EMOJIS: string[] = []; // Placeholder for recently used emojis


export default function EmojiPicker({ onEmojiSelect, onClose }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = React.useState('recents'); // 'recents', 'smileys', 'animals', etc.

  const handleSelect = (emoji: string) => {
    onEmojiSelect(emoji);
    // if (onClose) onClose(); // Optional: close picker after selection
  };

  const categoryTitle = activeCategory === 'recents' ? 'Recents' : 
                        activeCategory === 'smileys' ? 'Smileys & People' :
                        activeCategory === 'animals' ? 'Animals & Nature' :
                        activeCategory === 'food' ? 'Food & Drink' :
                        activeCategory === 'travel' ? 'Travel & Places' :
                        activeCategory === 'objects' ? 'Objects' :
                        'Emojis';


  // TODO: Based on activeCategory, filter/fetch the correct emoji list
  const emojisToDisplay = STANDARD_EMOJIS; 

  const categoryIcons = [
    { name: 'recents', icon: Clock, label: 'Recent emojis' },
    { name: 'smileys', icon: Smile, label: 'Smileys and people' },
    { name: 'animals', icon: Dog, label: 'Animals and nature' },
    { name: 'food', icon: Utensils, label: 'Food and drink' },
    { name: 'travel', icon: Car, label: 'Travel and places' },
    { name: 'objects', icon: Lightbulb, label: 'Objects' },
  ];

  return (
    <div className="w-full rounded-lg bg-background shadow-xl flex flex-col h-[350px]"> {/* Adjusted height */}
      {/* Optional: Top bar for Search, GIF, Stickers - Not implemented yet */}
      {/* <div className="p-2 border-b border-border flex items-center">
        <Search className="w-5 h-5 text-muted-foreground" />
        <Input placeholder="Search emojis" className="flex-1 h-8 ml-2 border-none focus-visible:ring-0 bg-transparent" />
      </div> */}
      
      <div className="px-3 pt-3 pb-2 text-sm font-medium text-muted-foreground">
        {categoryTitle}
      </div>

      <ScrollArea className="flex-grow w-full px-3">
        <div className="grid grid-cols-8 gap-1 pb-2">
          {emojisToDisplay.map((emoji, index) => (
            <Button
              key={index}
              variant="ghost"
              size="icon"
              className="text-2xl aspect-square hover:bg-accent/20" // Adjusted hover
              onClick={() => handleSelect(emoji)}
              aria-label={`Select emoji ${emoji}`}
            >
              {emoji}
            </Button>
          ))}
        </div>
      </ScrollArea>
      
      <div className="flex justify-around items-center p-1.5 border-t border-border bg-muted/30 rounded-b-lg">
        {categoryIcons.map(cat => (
          <Button
            key={cat.name}
            variant="ghost"
            size="icon"
            className={cn(
              "w-9 h-9 text-muted-foreground hover:text-primary", // Smaller icons
              activeCategory === cat.name && "text-primary bg-primary/10 rounded-md"
            )}
            onClick={() => setActiveCategory(cat.name)}
            aria-label={cat.label}
          >
            <cat.icon className="w-5 h-5" />
          </Button>
        ))}
      </div>
    </div>
  );
}
