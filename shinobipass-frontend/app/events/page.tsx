"use client";

import { useReadContract } from "wagmi";
import { EVENT_TICKET_ABI, EVENT_TICKET_ADDRESS } from "@/lib/contract";
import { EventCard, EventType } from "@/components/EventCard";
import { Navbar } from "@/components/Navbar";
import { SearchIcon, FilterIcon, Loader2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { createPublicClient, http } from "viem";
import { arcTestnet } from "@/lib/contract";

const publicClient = createPublicClient({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chain: arcTestnet as any,
  transport: http(process.env.NEXT_PUBLIC_ARC_RPC || "https://rpc.arc.testnet.circle.com"),
});

export default function ExploreEventsPage() {
  const [events, setEvents] = useState<EventType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { data: nextEventId } = useReadContract({
    address: EVENT_TICKET_ADDRESS as `0x${string}`,
    abi: EVENT_TICKET_ABI,
    functionName: "nextEventId",
  });

  useEffect(() => {
    async function fetchAllEvents() {
      if (nextEventId === undefined) return;
      
      setIsLoading(true);
      const total = Number(nextEventId);
      const fetchedEvents: EventType[] = [];
      
      try {
        const promises = [];
        for (let i = 0; i < total; i++) {
          promises.push(
            publicClient.readContract({
              address: EVENT_TICKET_ADDRESS as `0x${string}`,
              abi: EVENT_TICKET_ABI,
              functionName: "events",
              args: [BigInt(i)],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            }).then((e: any) => ({ ...e, id: i }))
          );
        }
        
        const results = await Promise.all(promises);
        results.forEach((res) => {
          fetchedEvents.push({
            id: res.id,
            name: res[0],
            description: res[1],
            organizer: res[2],
            date: Number(res[3]),
            maxSupply: Number(res[4]),
            minted: Number(res[5]),
            status: Number(res[6]),
            ticketPrice: res[7],
            resaleCapMultiplier: Number(res[8]),
            isResaleAllowed: res[9],
            usdcRecipient: res[10],
            escrowBalance: res[11],
            releaseDelay: Number(res[12]),
            bannerUrl: res[13] || "",
          });
        });
        
        setEvents(fetchedEvents.sort((a,b) => b.id - a.id));
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchAllEvents();
  }, [nextEventId]);

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[40%] h-[30%] bg-secondary/10 blur-[130px] rounded-full pointer-events-none"></div>
      
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-12 z-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12 border-b border-border/50 pb-8">
          <div>
            <h1 className="text-4xl font-bold font-sans text-white mb-2 tracking-tight">Explore the Underworld</h1>
            <p className="text-text-secondary text-lg">Discover active and upcoming events.</p>
          </div>
          
          <div className="flex gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <input 
                type="text" 
                placeholder="Search events..." 
                className="w-full bg-elevated/50 border border-border/50 text-white rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-primary/50 transition-colors placeholder:text-text-secondary/50 font-mono"
              />
            </div>
            <button className="bg-elevated/50 border border-border/50 p-2.5 rounded-lg text-text-secondary hover:text-white hover:border-primary/50 transition-colors">
              <FilterIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 text-text-secondary gap-4">
            <Loader2Icon className="w-8 h-8 animate-spin text-primary" />
            <span className="font-mono text-sm">Synchronizing ledger state...</span>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20 px-4 glass-panel rounded-xl border border-border/30">
            <span className="text-5xl block mb-6">🏜️</span>
            <h3 className="text-xl font-bold text-white mb-2">No active events</h3>
            <p className="text-text-secondary">It&apos;s quiet... Too quiet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {events.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
