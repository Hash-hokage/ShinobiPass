"use client";

import { useReadContract } from "wagmi";
import { EVENT_TICKET_ABI, EVENT_TICKET_ADDRESS, arcTestnet } from "@/lib/contract";
import { Navbar } from "@/components/Navbar";
import { useEffect, useState } from "react";
import { createPublicClient, http, formatUnits } from "viem";
import Link from "next/link";
import { Loader2Icon, ArrowRight } from "lucide-react";

const publicClient = createPublicClient({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chain: arcTestnet as any,
  transport: http(process.env.NEXT_PUBLIC_ARC_RPC || "https://rpc.arc.testnet.circle.com"),
});

export default function LandingPage() {
  const { data: nextEventId } = useReadContract({
    address: EVENT_TICKET_ADDRESS as `0x${string}`,
    abi: EVENT_TICKET_ABI,
    functionName: "nextEventId",
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAllEvents() {
      if (nextEventId === undefined) return;
      
      setIsLoading(true);
      const total = Number(nextEventId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fetchedEvents: any[] = [];
      
      try {
        const promises = [];
        // Only fetch up to 3 for the landing page featured section
        const limit = Math.min(total, 3);
        const start = Math.max(0, total - limit); // Fetch most recent

        for (let i = start; i < total; i++) {
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
            venue: res[1],
            date: Number(res[4]),
            price: res[5],
            status: Number(res[6]),
            maxSupply: Number(res[7]),
            minted: Number(res[8]),
            imageURI: res[13] || "",
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
    <div className="flex-grow bg-[#0a0a0f]">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-24 md:py-32 px-8 overflow-hidden bg-[#0a0a0f]">
        {/* Deep Depth Gradient */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-4xl bg-[#7c5cfc]/10 blur-[120px] rounded-full pointer-events-none -z-10"></div>
        
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col items-center text-center">
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            <span className="bg-white/5 border border-white/10 backdrop-blur-md px-4 py-1.5 rounded-full font-label text-sm text-gray-300 flex items-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
              </svg>
              Built on Arc
            </span>
            <span className="bg-white/5 border border-white/10 backdrop-blur-md px-4 py-1.5 rounded-full font-label text-sm text-gray-300 flex items-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <circle cx="12" cy="12" r="10"/><path d="M12 6v12M17 12H7"/>
              </svg>
              Powered by USDC
            </span>
            <span className="bg-white/5 border border-white/10 backdrop-blur-md px-4 py-1.5 rounded-full font-label text-sm text-gray-300 flex items-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
              <span className="text-[#f0c040]">⚡</span>
              Gasless UX
            </span>
          </div>
          
          <h1 className="font-headline text-4xl md:text-7xl lg:text-8xl font-extrabold leading-[1.1] tracking-[-0.04em] text-white mb-6">
            Own Your <span className="text-[#7c5cfc]">Ticket.</span>
          </h1>
          
          <p className="font-body text-xl md:text-2xl text-gray-300 max-w-2xl mb-12 leading-relaxed">
            NFT-powered event ticketing on Arc. Transparent, secure, and truly yours.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mb-8">
            <Link href="/events">
              <button className="bg-[#7c5cfc] hover:bg-[#6a4ae0] text-white px-8 py-4 rounded-lg font-body font-semibold text-lg shadow-[0_0_20px_rgba(124,92,252,0.4)] transition-all w-full">
                Explore Events
              </button>
            </Link>
            <Link href="/organizer/create">
              <button className="border border-[#7c5cfc]/50 bg-transparent text-white hover:bg-[#7c5cfc]/10 px-8 py-4 rounded-lg font-body font-semibold text-lg transition-all w-full">
                Create Event
              </button>
            </Link>
          </div>

          <div className="flex flex-col items-center gap-2">
            <p className="text-sm text-gray-500 font-medium">
              Trusted by organizers. Over 10,000 gasless tickets minted.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-8 bg-[#0a0a0f]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col gap-12 items-center w-full">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="font-headline text-3xl tracking-tight mb-4 text-white">The Process</h2>
              <p className="text-on-surface-variant">Seamless ticketing infrastructure designed for the modern web.</p>
            </div>
            
            <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="bg-[#12121a] border border-[#2a2a3a] rounded-[16px] p-8 hover:border-[#7c5cfc] transition-all group">
                <span className="text-[#7c5cfc] font-mono text-sm mb-4 block">01</span>
                <h3 className="font-headline text-xl mb-2 text-white">Create</h3>
                <p className="text-on-surface-variant text-sm">Mint event contracts directly on Arc with zero friction.</p>
              </div>
              {/* Step 2 */}
              <div className="bg-[#12121a] border border-[#2a2a3a] rounded-[16px] p-8 hover:border-[#7c5cfc] transition-all group">
                <span className="text-[#7c5cfc] font-mono text-sm mb-4 block">02</span>
                <h3 className="font-headline text-xl mb-2 text-white">Buy</h3>
                <p className="text-on-surface-variant text-sm">Purchase instantly with USDC. No gas fees, no hidden costs.</p>
              </div>
              {/* Step 3 */}
              <div className="bg-[#12121a] border border-[#2a2a3a] rounded-[16px] p-8 hover:border-[#7c5cfc] transition-all group">
                <span className="text-[#7c5cfc] font-mono text-sm mb-4 block">03</span>
                <h3 className="font-headline text-xl mb-2 text-white">Attend</h3>
                <p className="text-on-surface-variant text-sm">Verify entry with cryptographic proof. Your ticket, your asset.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Events */}
      <section className="py-16 px-8 relative bg-[#0a0a0f]">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-12">
            <h2 className="font-headline text-4xl tracking-tight text-white">Featured Events</h2>
            <Link href="/events" className="text-[#7c5cfc] hover:text-[#947dff] transition-colors flex items-center gap-1 font-body text-sm font-medium">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse bg-white/5 border border-white/10 rounded-[16px] h-80 shadow-inner"></div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center p-16 bg-[#12121a] rounded-xl border border-[#2a2a3a] border-dashed">
              <span className="text-4xl mb-4 text-on-surface-variant">🎭</span>
              <h3 className="text-xl font-headline text-white mb-2">No events yet</h3>
              <p className="text-text-secondary mb-6 text-center max-w-md">Be the first to create a premium event experience on the Shinobi platform.</p>
              <Link href="/organizer/create">
                <button className="bg-[#7c5cfc] text-white px-6 py-2.5 rounded-lg font-body font-medium hover:shadow-[0_0_20px_rgba(124,92,252,0.4)] transition-all">Create First Event</button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event) => (
                <div key={event.id} className="bg-[#12121a] rounded-[16px] overflow-hidden border border-[#2a2a3a] hover:border-[#7c5cfc]/50 hover:shadow-[0_0_20px_rgba(124,92,252,0.2)] hover:-translate-y-1 transition-all duration-300 group">
                  <div className="h-48 bg-surface-container-high relative overflow-hidden">
                    <img 
                      alt="Event Cover" 
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500" 
                      src={event.imageURI || "https://lh3.googleusercontent.com/aida-public/AB6AXuDYsxHOj1ykeW0MpeJMA0Ph1quSCPXdvRdYv49XSw8kK5IKX_ivDK8UH4jLLS5jMassbPJ84-3yuZ1gkta-8uSyzjMJ4cw9fiwwAETKqPRg4lFEe39jiwNlBAkGBwovhfYl-Se_c_Zj2EJaGEu-qnFxsIi_YXPXrS3ZFQqRpX5OphuNX-G21OaVjPVJp_mieKTHke2vKPcW6kNErqnWrg-LDVV-kCBZWN0LYWCLg49odw8bXDwQnZPUqsMsQ3P74T4mFXJhqrK8Xgfi"}
                    />
                    <div className="absolute top-4 left-4 bg-[#12121a]/60 backdrop-blur-md px-3 py-1 rounded-full font-label text-xs border border-[#2a2a3a] text-[#7c5cfc]">
                      {new Date(event.date * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase()}
                    </div>
                    {event.status === 0 && (
                      <div className="absolute top-4 right-4 bg-[#7c5cfc] text-white px-3 py-1 rounded-full font-label text-xs font-bold tracking-wider">
                        UPCOMING
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <h3 className="font-headline text-xl mb-2 truncate text-white">{event.name}</h3>
                    <p className="text-on-surface-variant text-sm mb-4 truncate">{event.venue}</p>
                    <div className="text-xs font-label text-on-surface-variant mb-4">
                      {event.maxSupply - event.minted} / {event.maxSupply} remaining
                    </div>
                    <div className="flex justify-between items-center border-t border-[#2a2a3a] pt-4">
                      <span className="font-label text-secondary">{formatUnits(event.price, 6)} USDC</span>
                      <Link href={`/events/${event.id}`}>
                        <button className="text-sm font-medium hover:text-[#7c5cfc] transition-colors text-white">Details</button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface-dim border-t border-outline-variant/15 text-primary font-body text-sm w-full py-12 flex flex-col md:flex-row justify-between items-center px-8 mx-auto gap-8 mt-auto relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between w-full items-center gap-8">
          <div className="text-xl font-bold tracking-tighter text-primary font-headline">
            ShinobiPass
          </div>
          <div className="flex gap-6">
            <Link href="/events" className="text-text-secondary hover:text-secondary transition-colors opacity-80 hover:opacity-100">Explore</Link>
            <Link href="/organizer/create" className="text-text-secondary hover:text-secondary transition-colors opacity-80 hover:opacity-100">Create</Link>
            <Link href="#" className="text-text-secondary hover:text-secondary transition-colors opacity-80 hover:opacity-100">Docs</Link>
          </div>
          <div className="text-text-secondary">
            © {new Date().getFullYear()} ShinobiPass. Built on Arc.
          </div>
        </div>
      </footer>
    </div>
  );
}
