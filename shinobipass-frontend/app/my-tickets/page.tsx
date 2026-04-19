"use client";

import { useEffect, useState } from "react";
import { EVENT_TICKET_ABI, EVENT_TICKET_ADDRESS } from "@/lib/contract";
import { useSmartWallet } from "@/hooks/useSmartWallet";
import { createPublicClient, http } from "viem";
import { arcTestnet } from "@/lib/contract";
import { Navbar } from "@/components/Navbar";

// Basic fallback client to read contract without connected wallet state if needed
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
        // TODO: Replace with sub-graph indexer
        // Scanning token IDs from 0 to 500 to find user's tickets (inefficient but required by specs for MVP)
        const userTickets = [];
        
        // This logic is extremely slow if done synchronously for 500 items, we can pipeline them in chunks.
        const chunkSize = 50;
        for (let i = 0; i < 500; i += chunkSize) {
          const promises = [];
          for (let j = 0; j < chunkSize; j++) {
            const tokenId = BigInt(i + j);
            promises.push(
              publicClient.readContract({
                address: EVENT_TICKET_ADDRESS as `0x${string}`,
                abi: EVENT_TICKET_ABI,
                functionName: "ownerOf",
                args: [tokenId],
              }).then(owner => ({ tokenId, owner })).catch(() => null)
            );
          }
          
          const results = await Promise.all(promises);
          for (const res of results) {
            if (res && typeof res.owner === "string" && res.owner.toLowerCase() === address.toLowerCase()) {
              // We found a ticket owned by the user! Let's get ticket details.
              const ticketInfo = await publicClient.readContract({
                address: EVENT_TICKET_ADDRESS as `0x${string}`,
                abi: EVENT_TICKET_ABI,
                functionName: "tickets",
                args: [res.tokenId],
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              }) as unknown as any[];
              
              const eventId = ticketInfo[0];
              const eventInfo = await publicClient.readContract({
                address: EVENT_TICKET_ADDRESS as `0x${string}`,
                abi: EVENT_TICKET_ABI,
                functionName: "events",
                args: [eventId],
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              }) as unknown as any[];

              userTickets.push({
                tokenId: res.tokenId.toString(),
                eventId: eventId.toString(),
                eventName: eventInfo[0] as string,
                eventDate: Number(eventInfo[4] || eventInfo[3]), // Contract ABI update mapping
                isUsed: ticketInfo[2] as boolean,
                isListed: ticketInfo[4] as boolean,
                resalePrice: ticketInfo[3].toString(),
              });
            }
          }
        }
        
        setTickets(userTickets);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTickets();
  }, [isConnected, address]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="bg-surface-container-lowest p-10 rounded-2xl text-center max-w-md w-full border border-outline-variant/15 shadow-ambient flex flex-col items-center">
            <span className="material-symbols-outlined text-[48px] text-primary mb-4">confirmation_number</span>
            <h2 className="text-2xl font-bold font-headline text-on-surface mb-2">My Tickets</h2>
            <p className="text-on-surface-variant font-body mb-8">Connect your wallet to view your tickets.</p>
            <button onClick={() => connect()} className="w-full py-3 bg-primary text-on-primary font-bold font-body rounded hover:opacity-90 transition-opacity">
              Connect Wallet
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Background glow specific to My Tickets */}
      <div className="absolute top-[-10%] inset-x-0 mx-auto w-[60%] h-[40%] bg-primary/10 blur-[140px] mix-blend-screen rounded-full pointer-events-none transition-all"></div>
      
      <Navbar />

      <main className="flex-1 w-full max-w-7xl mx-auto px-8 py-12 z-10 flex flex-col gap-12 mt-8">
        <div className="flex flex-col gap-2">
           <h1 className="text-5xl font-bold font-headline text-on-surface tracking-tight">Your Vault</h1>
           <p className="text-on-surface-variant font-body mb-2">Manage your exclusive event credentials.</p>
        </div>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant">
             <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="font-mono text-sm tracking-widest uppercase">Decrypting vault contents...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-32 bg-surface-container-lowest rounded-2xl border border-outline-variant/15 border-dashed shadow-inner flex flex-col items-center">
            <span className="text-5xl mb-4 block mix-blend-luminosity opacity-80">📭</span>
            <p className="text-on-surface-variant font-body mb-4 text-lg">No tickets found in your vault.</p>
            <button className="text-primary font-mono text-xs uppercase tracking-widest hover:underline decoration-primary underline-offset-4">Explore events -{'>'}</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {tickets.map(t => (
              <div key={t.tokenId} className={`bg-surface-container-lowest border-l-[3px] ${t.isUsed ? 'border-l-outline-variant/30 opacity-60' : 'border-l-primary'} rounded-xl overflow-hidden hover:shadow-glow transition-all hover:-translate-y-1 duration-300 border border-outline-variant/15 border-y-0 border-r-0 flex flex-col`}>
                <div className="p-6 border-b border-outline-variant/15 bg-surface-container/30">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-xl font-headline text-on-surface line-clamp-1">{t.eventName}</h3>
                    <div className="bg-surface-container-high px-2 py-1 rounded text-xs font-mono font-bold tracking-widest text-on-surface-variant">
                      #{t.tokenId}
                    </div>
                  </div>
                  <p className="text-sm text-on-surface-variant font-mono">
                    {new Date(t.eventDate * 1000).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
                  </p>
                </div>
                
                <div className="p-6 flex flex-col gap-4 bg-surface-container-lowest flex-1 justify-end">
                  {t.isUsed ? (
                    <div className="bg-surface-container-high border border-outline-variant/15 text-on-surface-variant text-sm px-4 py-3 rounded uppercase tracking-widest font-mono font-bold text-center">
                      Scanned & Used
                    </div>
                  ) : t.isListed ? (
                    <div className="bg-primary-container border border-primary-container/50 text-on-primary-container text-sm px-3 py-3 rounded font-mono text-center flex flex-col gap-1">
                      <span className="font-bold uppercase tracking-wider text-xs">Listed for Resale</span>
                      <span className="text-base font-bold">{Number(t.resalePrice) / 1000000} USDC</span>
                    </div>
                  ) : (
                    <div className="flex gap-3 mt-auto pt-2">
                      <button className="flex-1 bg-on-surface text-surface hover:bg-on-surface/90 py-2.5 rounded text-sm font-bold font-body transition-colors flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">qr_code_2</span> Show QR
                      </button>
                      <button className="flex-1 border border-primary text-primary hover:bg-primary/5 py-2.5 rounded text-sm font-bold font-body transition-colors flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">sell</span> List
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
