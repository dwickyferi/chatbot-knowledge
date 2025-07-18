'use client';

import React from 'react';
import { GlobeIcon, TerminalIcon, ChartIcon } from './icons';
import { Target } from 'lucide-react';

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'built-in' | 'github' | 'external';
}

interface SelectedToolsBadgeProps {
  tools: Tool[];
}

// Map of tool IDs to their icons (fallback if icon is not preserved)
const toolIconMap: Record<string, React.ReactNode> = {
  'web-search': <GlobeIcon size={14} />,
  'deep-research': <Target size={14} />,
  'charts': <ChartIcon size={14} />,
  'mcp-tools': <TerminalIcon size={14} />,
};

export function SelectedToolsBadge({ tools }: SelectedToolsBadgeProps) {
  if (tools.length === 0) return null;

  return (
    <div className="flex flex-row gap-2 overflow-x-scroll items-center">
      {tools.map((tool) => (
        <div
          key={tool.id}
          className="flex items-center gap-1.5 px-2 py-1 text-primary-foreground/80 rounded-full text-xs border border-primary-foreground/20 bg-primary-foreground/10"
        >
          {tool.icon || toolIconMap[tool.id]}
          <span>{tool.name}</span>
        </div>
      ))}
    </div>
  );
}

// Utility function to extract tools from message parts
export function extractToolsFromMessage(parts: any[]): Tool[] {
  console.log('🔍 extractToolsFromMessage called with parts:', parts);
  
  for (const part of parts) {
    console.log('🔍 Checking part:', part);
    if (part.type === 'text' && part.text?.includes('<!--SELECTED_TOOLS:')) {
      console.log('✅ Found tools metadata in text:', part.text);
      
      const match = part.text.match(/<!--SELECTED_TOOLS:(.+?)-->/);
      if (match) {
        try {
          const toolsData = JSON.parse(match[1]);
          console.log('✅ Parsed tools data:', toolsData);
          
          // Reconstruct tools with proper icons
          const restoredTools = toolsData.map((toolData: any) => ({
            id: toolData.id,
            name: toolData.name,
            description: toolData.description,
            category: toolData.category,
            icon: toolIconMap[toolData.id], // Always use the icon map
          }));
          
          console.log('✅ Restored tools:', restoredTools);
          return restoredTools;
        } catch (e) {
          console.error('❌ Error parsing selected tools:', e);
        }
      }
    }
  }
  
  console.log('❌ No tools found, returning empty array');
  return [];
}

// Utility function to clean text content from tool metadata
export function cleanMessageText(text: string): string {
  return text
    .replace(/<!--SELECTED_TOOLS:.+?-->/g, '')
    .replace(/\[User has requested deep research analysis on this topic\]/g, '')
    .replace(/\[User has requested deep research analysis\]/g, '')
    .replace(/\n\n$/, '') // Remove trailing newlines
    .trim();
}
