"use client";
import { Button } from "@/components/ui/button";
export default function DashboardError({ reset }: { reset: () => void }) {
  return <main className="mx-auto max-w-lg p-8"><h1 className="text-xl font-semibold">We couldn’t load this workspace</h1><p className="my-4 text-sm text-muted-foreground">Check the database connection and try again. In local development, make sure Supabase is running and its migrations have been applied.</p><Button onClick={reset}>Try again</Button></main>;
}
