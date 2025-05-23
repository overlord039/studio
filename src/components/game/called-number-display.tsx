
"use client";

import { Card, CardContent } from '@/components/ui/card';
import { Speaker } from 'lucide-react';

interface CalledNumberDisplayProps {
  currentNumber: number | null;
}

export default function CalledNumberDisplay({ currentNumber }: CalledNumberDisplayProps) {
  return (
    <Card className="shadow-lg bg-primary text-primary-foreground">
      <CardContent className="p-4 text-center">
        <p className="text-sm uppercase tracking-wider mb-2">Called Number</p>
        {currentNumber !== null ? (
          <div className="flex items-center justify-center">
            <Speaker className="h-10 w-10 mr-4 opacity-80" />
            <p className="text-7xl font-bold">{currentNumber}</p>
          </div>
        ) : (
          <p className="text-4xl font-semibold text-primary-foreground/70">-</p>
        )}
      </CardContent>
    </Card>
  );
}
