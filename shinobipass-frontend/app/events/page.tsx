"use client";

import { useReadContract } from "wagmi";
import { EVENT_TICKET_ABI, EVENT_TICKET_ADDRESS } from "@/lib/contract";
import { EventCard, EventType } from "@/components/EventCard";
import { Navbar } from "@/components/Navbar";
import { Loader2Icon } from "lucide-react";
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
            date: Number(res[4]),
            ticketPrice: res[5],
            status: Number(res[6]),
            maxSupply: Number(res[7]),
            minted: Number(res[8]),
            isResaleAllowed: res[9],
            usdcRecipient: res[10],
            resaleCapMultiplier: Number(res[11]),
            releaseDelay: Number(res[12]),
            bannerUrl: res[13] || "",
            // Unused by this mock array
            escrowBalance: res[3],
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
    <div className="flex-grow w-full">
      <div className="absolute top-0 right-0 w-[40%] h-[30%] bg-secondary/10 blur-[130px] rounded-full pointer-events-none"></div>
      
      <Navbar />

      <main className="w-full max-w-7xl mx-auto px-8 py-12 flex flex-col gap-12 bg-background z-10 relative">
        {/* Header & Search/Filter Section */}
        <section className="flex flex-col gap-8 w-full mt-8">
          <div className="flex flex-col md:flex-row justify-between items-end gap-6 w-full">
            <div className="flex flex-col gap-2">
              <h1 className="text-5xl font-bold font-headline text-on-surface tracking-tight">Explore Events</h1>
              <p className="text-on-surface-variant font-body">Discover premium Web3 gatherings and exclusive experiences.</p>
            </div>
            <div className="w-full md:w-96 relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
              <input 
                className="w-full bg-surface-container-highest text-on-surface placeholder:text-on-surface-variant/50 rounded-lg py-3 pl-12 pr-4 border border-outline-variant/15 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-surface-bright transition-all shadow-inner font-body" 
                placeholder="Search events, venues, or artists..." 
                type="text"
              />
            </div>
          </div>
          
          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-3 w-full">
            <button className="px-5 py-2 rounded-full bg-primary-container text-on-primary-container font-medium text-sm font-body border border-outline-variant/15">All</button>
            <button className="px-5 py-2 rounded-full bg-transparent text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface font-medium text-sm font-body border border-outline-variant/15 transition-colors">This Week</button>
            <button className="px-5 py-2 rounded-full bg-transparent text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface font-medium text-sm font-body border border-outline-variant/15 transition-colors">This Month</button>
            <button className="px-5 py-2 rounded-full bg-transparent text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface font-medium text-sm font-body border border-outline-variant/15 transition-colors">Free</button>
          </div>
        </section>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 text-text-secondary gap-4">
            <Loader2Icon className="w-8 h-8 animate-spin text-primary" />
            <span className="font-mono text-sm">Synchronizing ledger state...</span>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20 px-4 flex flex-col items-center justify-center bg-surface-container-lowest rounded-xl border border-outline-variant/15 border-dashed">
            <span className="text-5xl block mb-6">🏜️</span>
            <h3 className="text-xl font-bold font-headline text-on-surface mb-2">No active events</h3>
            <p className="text-on-surface-variant">It&apos;s quiet... Too quiet.</p>
          </div>
        ) : (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full">
            {events.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
