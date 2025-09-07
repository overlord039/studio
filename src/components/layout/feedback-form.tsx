

"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from "@/hooks/use-toast";
import { Star, MessageSquare } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { db } from '@/lib/firebase/config';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


export default function FeedbackForm() {
  const { currentUser } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (currentUser && !currentUser.isGuest) {
        const matchesPlayed = currentUser.stats?.matchesPlayed || 0;
        const lastPromptedAt = parseInt(localStorage.getItem('feedbackLastPromptedAt') || '-1', 10);

        // Logic for the first-time prompt after 3 games
        const shouldPromptForFirstTime = matchesPlayed === 3 && lastPromptedAt < 3;

        // Logic for subsequent prompts every 10 games
        const shouldPromptForRecurring = matchesPlayed > 3 && matchesPlayed % 10 === 0 && lastPromptedAt !== matchesPlayed;

        if (shouldPromptForFirstTime || shouldPromptForRecurring) {
            setOpen(true);
            localStorage.setItem('feedbackLastPromptedAt', String(matchesPlayed));
        }
    }
  }, [currentUser]);


  const ratingLabels: { [key: number]: string } = {
    1: 'Poor',
    2: 'Fair',
    3: 'Good',
    4: 'Great',
    5: 'Excellent!',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to submit feedback.",
        variant: "destructive",
      });
      return;
    }
    if (rating === 0 && feedback.trim() === '') {
      toast({
        title: "Feedback Required",
        description: "Please provide a rating or some feedback.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (!db) {
        throw new Error("Database not configured");
      }
      const feedbackCollectionRef = collection(db, "feedback");
      await addDoc(feedbackCollectionRef, {
        userId: currentUser.uid,
        userName: currentUser.displayName || 'Guest',
        rating,
        feedback: feedback.trim(),
        matchesPlayedAtSubmission: currentUser.stats?.matchesPlayed || 0,
        createdAt: serverTimestamp(),
      });

      toast({
        title: "Thank You!",
        description: "Your feedback has been submitted successfully.",
      });
      setOpen(false);
      setRating(0);
      setFeedback('');
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast({
        title: "Submission Failed",
        description: "Could not submit your feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="h-auto text-white">
            <MessageSquare className="h-5 w-5 mr-1" />
            <span className="text-[10px]">Feedback</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex justify-center mb-1">
            <MessageSquare className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="text-center text-lg">We’d love your feedback!</DialogTitle>
          <DialogDescription className="text-center text-xs">
            Your thoughts help us make HousieHub better.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1">
            <p className="text-center text-sm font-medium">Rate your experience</p>
            <div className="flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    'h-8 w-8 cursor-pointer transition-colors',
                    (hoverRating || rating) >= star
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-300'
                  )}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                />
              ))}
            </div>
            <p className="text-center text-xs text-muted-foreground h-4">
              {rating ? ratingLabels[rating] : ' '}
            </p>
          </div>
          <div className="space-y-1">
            <Textarea
              placeholder="Share your thoughts here..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              maxLength={500}
              className="min-h-[80px]"
            />
            <p className="text-xs text-muted-foreground text-right">{feedback.length} / 500</p>
          </div>
          <DialogFooter>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
