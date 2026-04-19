"use client";

import { useEffect, useState } from "react";
import { EVENT_TICKET_ABI, EVENT_TICKET_ADDRESS } from "@/lib/contract";
import { useSmartWallet } from "@/hooks/useSmartWallet";
import { createPublicClient, http } from "viem";
import { arcTestnet } from "@/lib/contract";
import { Navbar } from "@/components/Navbar";
import { Loader2Icon, TicketIcon, QrCodeIcon, NavigationIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

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
                eventDate: Number(eventInfo[3]),
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
          <div className="glass-panel p-10 rounded-xl text-center max-w-md w-full border border-border/50">
            <TicketIcon className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">My Tickets</h2>
            <p className="text-text-secondary mb-6">Connect your wallet to view your tickets.</p>
            <Button onClick={() => connect()} className="w-full bg-primary hover:bg-primary/90 text-white shadow-glow">
              Connect Wallet
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Background glow specific to My Tickets */}
      <div className="absolute top-[10%] inset-x-0 mx-auto w-[60%] h-[30%] bg-primary/10 blur-[100px] rounded-full pointer-events-none"></div>
      
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-12 z-10">
        <h1 className="text-3xl font-bold font-sans text-white mb-8 border-b border-border/50 pb-4">Digital Obsidian Vault</h1>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
            <Loader2Icon className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="font-mono text-sm">Decrypting vault contents...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-20 glass-panel rounded-xl border border-border/30 border-dashed">
            <span className="text-4xl mb-4 block">📭</span>
            <p className="text-text-secondary mb-2">No tickets found in your vault.</p>
            <Button variant="link" className="text-primary font-mono text-sm">Explore events -{'>'}</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tickets.map(t => (
              <div key={t.tokenId} className={`glass-panel border-l-4 ${t.isUsed ? 'border-l-border/50 opacity-60' : 'border-l-primary'} rounded-xl overflow-hidden hover:shadow-glow transition-all`}>
                <div className="p-5 border-b border-border/30 bg-surface/50">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-white line-clamp-1">{t.eventName}</h3>
                    <div className="bg-elevated px-2 py-1 rounded text-xs font-mono border border-border/50 text-text-secondary">
                      #{t.tokenId}
                    </div>
                  </div>
                  <p className="text-sm text-text-secondary">
                    {new Date(t.eventDate * 1000).toLocaleDateString()}
                  </p>
                </div>
                
                <div className="p-5 flex flex-col gap-4">
                  {t.isUsed ? (
                    <div className="bg-danger/10 border border-danger/20 text-danger text-sm px-3 py-2 rounded-lg font-medium text-center">
                      Scanned & Used
                    </div>
                  ) : t.isListed ? (
                    <div className="bg-warning/10 border border-warning/20 text-warning text-sm px-3 py-2 rounded-lg font-medium text-center flex flex-col">
                      <span>Listed for Resale</span>
                      <span className="font-mono text-xs">{Number(t.resalePrice) / 1000000} USDC</span>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button className="flex-1 bg-surface hover:bg-elevated border border-border/50 text-white gap-2 font-mono" size="sm">
                        <QrCodeIcon className="w-4 h-4" /> Show QR
                      </Button>
                      <Button className="border border-primary/50 text-primary hover:bg-primary/10 gap-2 font-mono" size="sm" variant="outline">
                        <NavigationIcon className="w-4 h-4" /> List
                      </Button>
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
