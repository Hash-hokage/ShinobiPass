"use client";

import { useEffect, useState } from "react";
import { EVENT_TICKET_ABI, EVENT_TICKET_ADDRESS, arcTestnet } from "@/lib/contract";
import { useSmartWallet } from "@/hooks/useSmartWallet";
import { createPublicClient, http, parseAbiItem } from "viem";
import { Navbar } from "@/components/Navbar";
import Link from "next/link";
import { TicketIcon, Search, Loader2 } from "lucide-react";

const publicClient = createPublicClient({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chain: arcTestnet as any,
  transport: http(process.env.NEXT_PUBLIC_ARC_RPC || "https://rpc.arc.testnet.circle.com"),
});

export default function MyTicketsPage() {
  const { isConnected, address, connect } = useSmartWallet();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [tickets, setTickets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchTickets() {
      if (!isConnected || !address) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        // 1. Fetch all Transfer events to the user
        const logs = await publicClient.getLogs({
          address: EVENT_TICKET_ADDRESS as `0x${string}`,
          event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'),
          args: {
            to: address as `0x${string}`
          },
          fromBlock: 0n // or deployment block
        });

        if (logs.length === 0) {
          setTickets([]);
          return;
        }

        // 2. Extract unique token IDs
        const candidateIds = Array.from(new Set(logs.map(log => log.args.tokenId!)));

        // 3. Verify current ownership and fetch ticket data in batch
        const verificationCalls = candidateIds.flatMap(tokenId => [
          {
            address: EVENT_TICKET_ADDRESS as `0x${string}`,
            abi: EVENT_TICKET_ABI,
            functionName: 'ownerOf',
            args: [tokenId]
          },
          {
            address: EVENT_TICKET_ADDRESS as `0x${string}`,
            abi: EVENT_TICKET_ABI,
            functionName: 'tickets',
            args: [tokenId]
          }
        ]);

        const verificationResults = await publicClient.multicall({
          contracts: verificationCalls,
          allowFailure: true
        });

        const verifiedTickets: any[] = [];
        const eventIdsToFetch = new Set<bigint>();

        for (let i = 0; i < candidateIds.length; i++) {
          const ownerOfRes = verificationResults[i * 2];
          const ticketRes = verificationResults[i * 2 + 1];

          if (
            ownerOfRes.status === 'success' && 
            (ownerOfRes.result as string).toLowerCase() === address.toLowerCase() &&
            ticketRes.status === 'success'
          ) {
            const ticketData = ticketRes.result as any[];
            const eventId = ticketData[0] as bigint;
            eventIdsToFetch.add(eventId);

            verifiedTickets.push({
              tokenId: candidateIds[i].toString(),
              eventId,
              seatNumber: ticketData[1],
              isUsed: ticketData[2],
              resalePrice: ticketData[3],
              isListed: (ticketData[3] as bigint) > 0n
            });
          }
        }

        if (verifiedTickets.length === 0) {
          setTickets([]);
          return;
        }

        // 4. Fetch Event metadata for the owned tickets
        const uniqueEventIds = Array.from(eventIdsToFetch);
        const eventCalls = uniqueEventIds.map(eventId => ({
          address: EVENT_TICKET_ADDRESS as `0x${string}`,
          abi: EVENT_TICKET_ABI,
          functionName: 'events',
          args: [eventId]
        }));

        const eventResults = await publicClient.multicall({
          contracts: eventCalls,
          allowFailure: true
        });

        const eventMap = new Map();
        uniqueEventIds.forEach((id, idx) => {
          if (eventResults[idx].status === 'success') {
            eventMap.set(id.toString(), eventResults[idx].result);
          }
        });

        // 5. Final Assembly
        const finalTickets = verifiedTickets.map(t => {
          const ev = eventMap.get(t.eventId.toString());
          return {
            ...t,
            eventName: ev ? ev[0] : "Unknown Event",
            eventDate: ev ? Number(ev[4]) : 0,
            eventId: t.eventId.toString()
          };
        });

        setTickets(finalTickets.sort((a, b) => Number(b.tokenId) - Number(a.tokenId)));
      } catch (e) {
        console.error("Error fetching vault:", e);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTickets();
  }, [isConnected, address]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="bg-white/5 backdrop-blur-md p-10 rounded-2xl text-center max-w-md w-full border border-white/10 shadow-2xl flex flex-col items-center">
            <TicketIcon className="w-16 h-16 text-[#7c5cfc] mb-6 opacity-80" />
            <h2 className="text-3xl font-bold font-headline text-white mb-3">Your Vault</h2>
            <p className="text-gray-400 font-body mb-8">Connect your secure smart account to view and manage your digital collectibles.</p>
            <button 
              onClick={() => connect()} 
              className="w-full py-4 bg-[#7c5cfc] hover:bg-[#6a4ae0] text-white font-bold font-body rounded-xl shadow-[0_0_20px_rgba(124,92,252,0.3)] transition-all active:scale-[0.98]"
            >
              Sign In to Access
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col relative overflow-hidden">
      {/* Deep Background Depth */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-6xl bg-[#7c5cfc]/5 blur-[120px] rounded-full pointer-events-none -z-10"></div>
      
      <Navbar />

      <main className="flex-1 w-full max-w-7xl mx-auto px-8 py-12 z-10 flex flex-col gap-12 mt-16">
        <div className="flex flex-col gap-2">
           <h1 className="text-5xl md:text-6xl font-extrabold font-headline text-white tracking-tight">Digital Vault</h1>
           <p className="text-gray-400 text-lg font-body">Manage your verified event credentials and collectibles.</p>
        </div>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-[#7c5cfc]" />
            <p className="font-mono text-xs uppercase tracking-[0.2em] animate-pulse">Synchronizing vault with Arc ledger...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-32 bg-white/5 rounded-2xl border border-white/10 border-dashed backdrop-blur-sm flex flex-col items-center gap-6">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
              <Search className="w-8 h-8 text-gray-600" />
            </div>
            <div className="max-w-md">
              <h3 className="text-xl font-bold text-white mb-2">Vault is Empty</h3>
              <p className="text-gray-400 mb-8">You haven&apos;t secured any tickets yet. Explore the marketplace to find your next experience.</p>
              <Link href="/events">
                <button className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-8 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 mx-auto group">
                  Explore Events <span className="group-hover:translate-x-1 transition-transform">→</span>
                </button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {tickets.map(t => (
              <div key={t.tokenId} className={`group bg-white/5 backdrop-blur-md rounded-2xl overflow-hidden border border-white/10 hover:border-[#7c5cfc]/50 hover:shadow-[0_0_30px_rgba(124,92,252,0.15)] transition-all duration-500 flex flex-col ${t.isUsed ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                <div className="p-8 border-b border-white/5 bg-gradient-to-br from-white/[0.02] to-transparent">
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-[#7c5cfc]/10 border border-[#7c5cfc]/20 px-3 py-1 rounded-full text-[10px] font-bold tracking-[0.2em] text-[#947dff] uppercase">
                      Ticket #{t.tokenId}
                    </div>
                    {t.isUsed && (
                      <span className="text-[10px] font-bold text-gray-500 tracking-widest uppercase bg-white/5 px-2 py-1 rounded">Used</span>
                    )}
                  </div>
                  <h3 className="font-bold text-2xl font-headline text-white mb-2 line-clamp-2 leading-tight">{t.eventName}</h3>
                  <div className="flex items-center gap-2 text-gray-400 font-mono text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#7c5cfc]"></span>
                    {new Date(t.eventDate * 1000).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
                  </div>
                </div>
                
                <div className="p-8 flex flex-col gap-4 flex-1 justify-end bg-black/20">
                  {t.isUsed ? (
                    <div className="w-full py-4 border border-white/5 text-gray-500 text-xs px-4 rounded-xl uppercase tracking-widest font-bold text-center">
                      Scanned & Verified
                    </div>
                  ) : t.isListed ? (
                    <div className="bg-[#7c5cfc]/10 border border-[#7c5cfc]/20 text-white p-4 rounded-xl flex flex-col gap-1 text-center">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#947dff]">Listed for Resale</span>
                      <span className="text-xl font-bold font-mono">{Number(t.resalePrice) / 1000000} USDC</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <button className="bg-white text-black hover:bg-gray-200 py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.98]">
                        Show QR
                      </button>
                      <button className="bg-white/5 border border-white/10 text-white hover:bg-white/10 py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.98]">
                        List
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
