"use client";

import { useReadContract } from "wagmi";
import { EVENT_TICKET_ABI, EVENT_TICKET_ADDRESS } from "@/lib/contract";
import { EventCard, EventType } from "@/components/EventCard";
import { Navbar } from "@/components/Navbar";
import { Loader2Icon, Search } from "lucide-react";
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
    <div className="flex-grow w-full bg-[#0a0a0f]">
      <div className="absolute top-0 right-0 w-[40%] h-[30%] bg-[#7c5cfc]/10 blur-[130px] rounded-full pointer-events-none"></div>
      
      <Navbar />

      <main className="w-full max-w-7xl mx-auto px-8 py-12 flex flex-col gap-12 z-10 relative">
        {/* Header Section */}
        <section className="flex flex-col gap-8 w-full mt-12">
          <div className="flex flex-col gap-2 text-left">
            <h1 className="text-5xl md:text-6xl font-extrabold font-headline text-white tracking-tight">Explore Events</h1>
            <p className="text-gray-400 text-lg font-body">Discover premium Web3 gatherings and exclusive experiences.</p>
          </div>

          {/* Control Panel: Filters & Search */}
          <div className="flex flex-col md:flex-row justify-between items-center w-full gap-6">
            {/* Filter Pills */}
            <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto hide-scrollbar whitespace-nowrap">
              <button className="px-5 py-2 rounded-full bg-[#7c5cfc] text-white font-medium text-sm transition-all shadow-[0_0_15px_rgba(124,92,252,0.3)]">All</button>
              <button className="px-5 py-2 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 font-medium text-sm transition-all">This Week</button>
              <button className="px-5 py-2 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 font-medium text-sm transition-all">This Month</button>
              <button className="px-5 py-2 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 font-medium text-sm transition-all">Free</button>
            </div>

            {/* Search Bar */}
            <div className="w-full md:w-96 relative group">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-[#7c5cfc] transition-colors" />
              <input 
                className="w-full bg-white/5 border border-white/10 text-white placeholder:text-gray-500 rounded-lg py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-[#7c5cfc]/50 focus:border-transparent transition-all font-body text-sm" 
                placeholder="Search events, venues, or artists..." 
                type="text"
              />
            </div>
          </div>
        </section>

        {isLoading ? (
          <div className="flex flex-col gap-12">
            <div className="flex flex-col items-center justify-center gap-3">
              <Loader2Icon className="w-6 h-6 animate-spin text-[#7c5cfc]" />
              <span className="font-mono text-xs text-gray-500 uppercase tracking-widest">Synchronizing ledger state...</span>
            </div>
            
            {/* Skeleton Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="animate-pulse bg-white/5 rounded-xl h-80 border border-white/5 shadow-inner"></div>
              ))}
            </div>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20 px-4 flex flex-col items-center justify-center bg-white/5 rounded-xl border border-white/10 border-dashed">
            <span className="text-5xl block mb-6">🏜️</span>
            <h3 className="text-xl font-bold font-headline text-white mb-2">No active events</h3>
            <p className="text-gray-400">It&apos;s quiet... Too quiet.</p>
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
