
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller, useWatch } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PRIZE_DISTRIBUTION_PERCENTAGES, PRIZE_DEFINITIONS, DEFAULT_GAME_SETTINGS } from "@/lib/constants";
import type { PrizeType } from "@/types";
import { PRIZE_TYPES } from "@/types";
import { Calculator, Ticket, Users, Percent, Gift, IndianRupee, AlertTriangle, Settings2, EyeOff } from "lucide-react";
import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const prizeCategories = PRIZE_DEFINITIONS[DEFAULT_GAME_SETTINGS.prizeFormat];
const defaultPercentages = PRIZE_DISTRIBUTION_PERCENTAGES[DEFAULT_GAME_SETTINGS.prizeFormat];

const percentageSchema = z.number().min(0, "Min 0%").max(100, "Max 100%");

const prizeCalculatorFormSchema = z.object({
  ticketPrice: z.coerce.number().positive({ message: "Ticket price must be positive." }),
  ticketsSold: z.coerce.number().int().positive({ message: "Tickets sold must be a positive whole number." }),
  percentages: z.object(
    prizeCategories.reduce((acc, prize) => {
      acc[prize] = percentageSchema;
      return acc;
    }, {} as Record<PrizeType, typeof percentageSchema>)
  ),
}).refine(data => {
  const sum = prizeCategories.reduce((acc, prize) => acc + (data.percentages[prize] || 0), 0);
  return Math.abs(sum - 100) < 0.01; // Allow for minor floating point inaccuracies
}, {
  message: "Total percentage must be 100%.",
  path: ["percentages"], 
});

type PrizeCalculatorFormValues = z.infer<typeof prizeCalculatorFormSchema>;

interface CalculatedPrizes {
  totalCollection: number;
  [key: PrizeType]: number;
}

export default function PrizeCalculatorPage() {
  const [calculatedPrizes, setCalculatedPrizes] = useState<CalculatedPrizes | null>(null);
  const [isPercentageCustomizationVisible, setIsPercentageCustomizationVisible] = useState(false);

  const form = useForm<PrizeCalculatorFormValues>({
    resolver: zodResolver(prizeCalculatorFormSchema),
    defaultValues: {
      ticketPrice: undefined, // Changed from 10
      ticketsSold: undefined, // Changed from 100
      percentages: {
        [PRIZE_TYPES.EARLY_5]: defaultPercentages[PRIZE_TYPES.EARLY_5],
        [PRIZE_TYPES.FIRST_LINE]: defaultPercentages[PRIZE_TYPES.FIRST_LINE],
        [PRIZE_TYPES.SECOND_LINE]: defaultPercentages[PRIZE_TYPES.SECOND_LINE],
        [PRIZE_TYPES.THIRD_LINE]: defaultPercentages[PRIZE_TYPES.THIRD_LINE],
        [PRIZE_TYPES.FULL_HOUSE]: defaultPercentages[PRIZE_TYPES.FULL_HOUSE],
      },
    },
  });

  const watchedValues = useWatch({ control: form.control });

  useEffect(() => {
    const subscription = form.watch((values, { name, type }) => {
      if (type === 'change') {
        const { ticketPrice, ticketsSold, percentages } = values as PrizeCalculatorFormValues;
        
        const currentTicketPrice = typeof ticketPrice === 'number' ? ticketPrice : parseFloat(String(ticketPrice));
        const currentTicketsSold = typeof ticketsSold === 'number' ? ticketsSold : parseInt(String(ticketsSold), 10);

        if (currentTicketPrice > 0 && currentTicketsSold > 0 && percentages) {
           const percentageSum = prizeCategories.reduce((acc, prize) => acc + (percentages[prize] || 0), 0);
           if (Math.abs(percentageSum - 100) < 0.01) {
            const totalPool = currentTicketPrice * currentTicketsSold;
            const newPrizes: CalculatedPrizes = { totalCollection: totalPool } as CalculatedPrizes;
            prizeCategories.forEach(prize => {
              newPrizes[prize] = ( (percentages[prize] || 0) / 100) * totalPool;
            });
            setCalculatedPrizes(newPrizes);
            form.clearErrors("percentages"); 
          } else {
            setCalculatedPrizes(null); 
             form.setError("percentages", { type: "manual", message: "Total percentage must be 100%." });
          }
        } else {
          setCalculatedPrizes(null);
        }
      }
    });
    
     const initialValues = form.getValues();
     const initialTicketPrice = typeof initialValues.ticketPrice === 'number' ? initialValues.ticketPrice : parseFloat(String(initialValues.ticketPrice));
     const initialTicketsSold = typeof initialValues.ticketsSold === 'number' ? initialValues.ticketsSold : parseInt(String(initialValues.ticketsSold), 10);

     if (initialTicketPrice > 0 && initialTicketsSold > 0 && initialValues.percentages) {
       const percentageSum = prizeCategories.reduce((acc, prize) => acc + (initialValues.percentages[prize] || 0), 0);
       if (Math.abs(percentageSum - 100) < 0.01) {
           const totalPool = initialTicketPrice * initialTicketsSold;
            const newPrizes: CalculatedPrizes = { totalCollection: totalPool } as CalculatedPrizes;
            prizeCategories.forEach(prize => {
              newPrizes[prize] = ( (initialValues.percentages[prize] || 0) / 100) * totalPool;
            });
            setCalculatedPrizes(newPrizes);
       }
     }


    return () => subscription.unsubscribe();
  }, [form]);

  function onSubmit(values: PrizeCalculatorFormValues) {
    // This function is not strictly needed as calculations are real-time,
    // but kept for potential future use (e.g., if there was a "Calculate" button).
    const { ticketPrice, ticketsSold, percentages } = values;
     const percentageSum = prizeCategories.reduce((acc, prize) => acc + (percentages[prize] || 0), 0);
     if (ticketPrice > 0 && ticketsSold > 0 && Math.abs(percentageSum - 100) < 0.01) {
        const totalPool = ticketPrice * ticketsSold;
        const newPrizes: CalculatedPrizes = { totalCollection: totalPool } as CalculatedPrizes;
        prizeCategories.forEach(prize => {
          newPrizes[prize] = (percentages[prize] / 100) * totalPool;
        });
        setCalculatedPrizes(newPrizes);
     } else {
        setCalculatedPrizes(null);
     }
  }
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  };

  const currentPercentageSum = watchedValues.percentages ? prizeCategories.reduce((acc, prize) => acc + (watchedValues.percentages?.[prize] || 0), 0) : 0;


  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Card className="w-full max-w-3xl shadow-xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Calculator className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold">Prize Calculator</CardTitle>
          <CardDescription>Calculate Housie prize money distribution.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="ticketPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center"><Ticket className="mr-2 h-4 w-4 text-muted-foreground"/>Ticket Price (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 10" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ticketsSold"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center"><Users className="mr-2 h-4 w-4 text-muted-foreground"/>Total Tickets Sold</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 100" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Card className="p-4 bg-secondary/30">
                <div className="flex justify-between items-center mb-3">
                    <CardTitle className="text-xl flex items-center">
                    <Percent className="mr-2 h-5 w-5 text-primary"/>Prize Percentage Allocation
                    </CardTitle>
                    <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setIsPercentageCustomizationVisible(!isPercentageCustomizationVisible)}
                        className="text-sm"
                    >
                        {isPercentageCustomizationVisible ? <EyeOff className="mr-2 h-4 w-4" /> : <Settings2 className="mr-2 h-4 w-4" />}
                        {isPercentageCustomizationVisible ? "Hide Customization" : "Customize"}
                    </Button>
                </div>

                {isPercentageCustomizationVisible && (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {prizeCategories.map(prize => (
                            <FormField
                            key={prize}
                            control={form.control}
                            name={`percentages.${prize}`}
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>{prize} (%)</FormLabel>
                                <FormControl>
                                    <Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)}/>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                        ))}
                        </div>
                        <div className={cn(
                            "mt-3 text-sm font-medium",
                            Math.abs(currentPercentageSum - 100) >= 0.01 ? "text-destructive" : "text-green-600"
                        )}>
                        Total Percentage: {currentPercentageSum.toFixed(2)}%
                        {Math.abs(currentPercentageSum - 100) >= 0.01 && " (Must be 100%)"}
                        </div>
                        {form.formState.errors.percentages && (
                            <p className="text-sm font-medium text-destructive mt-2 flex items-center">
                                <AlertTriangle className="h-4 w-4 mr-1" />
                                {form.formState.errors.percentages.message}
                            </p>
                        )}
                    </>
                )}
                {!isPercentageCustomizationVisible && (
                    <p className="text-sm text-muted-foreground mt-2">
                        Using default percentages:{" "}
                        {prizeCategories.map(prize => `${prize} (${defaultPercentages[prize]}%)`).join(", ")}.
                        Click "Customize" to change.
                    </p>
                )}
              </Card>
              
            </form>
          </Form>

          {calculatedPrizes && Math.abs(currentPercentageSum - 100) < 0.01 && (
            <div className="mt-8 pt-6 border-t">
              <h3 className="text-2xl font-semibold mb-4 text-center flex items-center justify-center">
                <Gift className="mr-2 h-6 w-6 text-primary"/>Calculated Prizes
              </h3>
              <Card className="bg-green-50 dark:bg-green-900/30 p-4">
                <CardContent className="space-y-3 pt-4">
                    <div className="flex justify-between items-center text-lg font-semibold">
                        <span className="flex items-center"><IndianRupee className="mr-1 h-5 w-5"/>Total Collection:</span>
                        <span>{formatCurrency(calculatedPrizes.totalCollection)}</span>
                    </div>
                    <hr/>
                  {prizeCategories.map(prize => (
                    <div key={prize} className="flex justify-between items-center">
                      <span className="text-muted-foreground">{prize}:</span>
                      <span className="font-medium">{formatCurrency(calculatedPrizes[prize] || 0)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
