"use client";

import { useReadContract } from "wagmi";
import { EVENT_TICKET_ABI, EVENT_TICKET_ADDRESS } from "@/lib/contract";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Loader2Icon, ArrowRightIcon } from "lucide-react";

export default function LandingPage() {
  const { data: nextEventId, isLoading } = useReadContract({
    address: EVENT_TICKET_ADDRESS,
    abi: EVENT_TICKET_ABI,
    functionName: "nextEventId",
  });

  // Since we cannot iterate cleanly inside useReadContract without hooks rules,
  // we could just fetch the first 3 events. For a demo landing page, a static list fetching or an indexer is ideal.
  // Here we mock the top events display since the actual contract doesn't have a getAllEvents.
  // In production, we'd use a subgraph. For this demo, let's pretend we have a robust query or mock a few.

  return (
    <div className="min-h-screen relative flex flex-col overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-teal/10 blur-[120px] rounded-full pointer-events-none"></div>
      
      {/* Noise overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}
      ></div>

      <Navbar />

      <main className="flex-1 container mx-auto px-4 z-10 flex flex-col">
        {/* Hero Section */}
        <div className="flex flex-col items-center justify-center py-24 text-center mt-8">
          <div className="inline-flex items-center px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-mono mb-8 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse mr-2"></span>
            Arc Testnet is Live
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold font-sans tracking-tighter mb-6 bg-gradient-to-br from-white to-text-secondary bg-clip-text text-transparent">
            The Pass to the <br /> 
            <span className="bg-gradient-primary bg-clip-text text-transparent">Underworld</span>
          </h1>
          
          <p className="max-w-2xl text-text-secondary text-lg mb-10 leading-relaxed">
            Gasless, highly-secure, and fully on-chain event ticketing. Welcome to the future of the Shinobi platform, powered by ZeroDev and Transak.
          </p>
          
          <div className="flex items-center gap-4">
            <Link href="/events">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-white font-medium shadow-glow hover:shadow-glow-hover transition-all gap-2 h-12 px-8">
                Explore Events <ArrowRightIcon className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/organizer/create">
              <Button size="lg" variant="outline" className="border-border hover:bg-white/5 text-white font-medium h-12 px-8 backdrop-blur-sm">
                Create Event
              </Button>
            </Link>
          </div>
        </div>

        {/* Featured Events */}
        <div className="py-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold font-sans text-white">Trending Events</h2>
            <Link href="/events" className="text-primary hover:text-primary/80 font-medium text-sm flex items-center gap-1 transition-colors">
              View all <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center p-20">
              <Loader2Icon className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Number(nextEventId) > 0 ? (
                // We'd map through actual fetched events here. For the landing page we can just show a prompt to explore.
                <div className="col-span-full text-center p-12 glass-panel rounded-xl border border-border/50">
                  <p className="text-text-secondary mb-4">{Number(nextEventId)} events found.</p>
                  <Link href="/events">
                    <Button variant="outline" className="border-primary/50 text-primary hover:bg-primary/10">Browse Events Catalog</Button>
                  </Link>
                </div>
              ) : (
                <div className="col-span-full flex flex-col items-center justify-center p-16 glass-panel rounded-xl border border-border/50 border-dashed">
                  <span className="text-4xl mb-4">🎭</span>
                  <h3 className="text-xl font-bold text-white mb-2">No events yet</h3>
                  <p className="text-text-secondary mb-6 text-center max-w-md">Be the first to create a premium event experience on the Shinobi platform.</p>
                  <Link href="/organizer/create">
                    <Button className="bg-primary hover:bg-primary/90 text-white shadow-glow">Create First Event</Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
