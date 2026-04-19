"use client";

import { useState } from "react";
import { useReadContract } from "wagmi";
import { EVENT_TICKET_ABI, EVENT_TICKET_ADDRESS } from "@/lib/contract";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { useSmartWallet } from "@/hooks/useSmartWallet";
import { formatUnits } from "viem";
import { CalendarIcon, MapPinIcon, TicketIcon, CreditCardIcon, WalletIcon } from "lucide-react";
import { openTransakWidget } from "@/lib/transak";

export default function EventDetailPage({ params }: { params: { id: string } }) {
  const eventId = BigInt(params.id);
  const { isConnected, address, connect, sendUserOp } = useSmartWallet();
  const [isMinting, setIsMinting] = useState(false);

  const { data: eventInfo } = useReadContract({
    address: EVENT_TICKET_ADDRESS as `0x${string}`,
    abi: EVENT_TICKET_ABI,
    functionName: "events",
    args: [eventId],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as { data: any[] | undefined };

  if (!eventInfo) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex justify-center items-center">
          <div className="animate-pulse flex flex-col items-center gap-4">
             <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
             <p className="text-text-secondary font-mono text-sm">Decrypting metadata...</p>
          </div>
        </div>
      </div>
    );
  }

  const name = eventInfo[0];
  const desc = eventInfo[1];
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _organizer = eventInfo[2];
  const date = Number(eventInfo[3]);
  const maxSupply = Number(eventInfo[4]);
  const minted = Number(eventInfo[5]);
  const status = Number(eventInfo[6]);
  const price = eventInfo[7];
  const bannerUrl = eventInfo[13] || "";

  const isSoldOut = minted >= maxSupply;
  const isCancelled = status === 1;

  const handleMintWithUSDC = async () => {
    if (!isConnected) return connect();
    try {
      setIsMinting(true);
      // Dummy userOp interaction for Minting
      await sendUserOp([
        // Provide allowance to EventTicket
        {
           to: "0x3600000000000000000000000000000000000000", // USDC
           data: "0x095ea7b3" + EVENT_TICKET_ADDRESS.replace("0x", "").padStart(64, '0') + price.toString(16).padStart(64, '0') 
        },
        // Mint Ticket
        {
           to: EVENT_TICKET_ADDRESS,
           data: "0x256d52f6" + eventId.toString(16).padStart(64, '0')
        }
      ]);
      alert("Mint successful!");
    } catch (e: unknown) {
      alert("Failed to mint: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsMinting(false);
    }
  };

  const handleBuyWithCard = () => {
    if (!address) return connect();
    openTransakWidget(address);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Dynamic Background generated from banner if exists, else gradient */}
      {bannerUrl ? (
        <div 
          className="absolute inset-x-0 top-0 h-[60vh] opacity-20 pointer-events-none"
          style={{ backgroundImage: `url(${bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background"></div>
        </div>
      ) : (
        <div className="absolute inset-x-0 top-[-20%] h-[50vh] bg-primary/20 blur-[140px] rounded-full pointer-events-none"></div>
      )}

      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-12 z-10 flex flex-col lg:flex-row gap-12">
        {/* Left Column: Image & Details */}
        <div className="flex-1 flex flex-col gap-8">
          <div 
            className="w-full aspect-video rounded-2xl glass-panel border border-border/50 shadow-glow overflow-hidden relative"
            style={bannerUrl ? { backgroundImage: `url(${bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
          >
             {!bannerUrl && (
               <div className="absolute inset-0 bg-gradient-to-br from-surface to-elevated flex items-center justify-center">
                 <span className="text-text-secondary/50 font-mono">No Image Provided</span>
               </div>
             )}
          </div>
          
          <div>
            <div className="inline-flex items-center px-3 py-1 bg-elevated border border-border/50 text-text-secondary rounded-full text-xs font-mono mb-4">
               {isCancelled ? "Cancelled" : isSoldOut ? "Sold Out" : "Minting Live"}
            </div>
            <h1 className="text-4xl md:text-5xl font-bold font-sans text-white mb-6">
              {name}
            </h1>
            
            <p className="text-text-secondary text-lg leading-relaxed whitespace-pre-wrap">
              {desc}
            </p>
          </div>
        </div>

        {/* Right Column: Checkout Panel */}
        <div className="w-full lg:w-[400px]">
          <div className="sticky top-24 glass-panel p-6 rounded-2xl shadow-glow-hover border border-primary/20">
            <h3 className="font-bold text-xl text-white mb-6 border-b border-border/50 pb-4">Secure Ticket checkout</h3>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3 text-text-secondary">
                <div className="w-10 h-10 rounded-full bg-elevated flex items-center justify-center border border-border/50">
                  <CalendarIcon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-white text-sm">Date & Time</p>
                  <p className="text-xs font-mono">{new Date(date * 1000).toLocaleString()}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 text-text-secondary">
                <div className="w-10 h-10 rounded-full bg-elevated flex items-center justify-center border border-border/50">
                  <MapPinIcon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-white text-sm">Location</p>
                  <p className="text-xs">Location metadata</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 text-text-secondary">
                <div className="w-10 h-10 rounded-full bg-elevated flex items-center justify-center border border-border/50">
                  <TicketIcon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-white text-sm">Availability</p>
                  <p className="text-xs font-mono">
                    <span className="text-white">{minted}</span> / {maxSupply} minted
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-background rounded-xl p-4 border border-border/50 mb-6 flex justify-between items-center">
               <span className="text-text-secondary">Price</span>
               <span className="text-2xl font-bold font-mono text-white">{formatUnits(price, 6)} <span className="text-sm text-primary">USDC</span></span>
            </div>
            
            <div className="flex flex-col gap-3">
              <Button 
                onClick={handleBuyWithCard}
                className="w-full bg-white text-background hover:bg-white/90 shadow-glow h-12 font-medium flex items-center justify-center gap-2"
                disabled={isCancelled || (isSoldOut && !isCancelled)} /* Demo assumption */
              >
                <CreditCardIcon className="w-5 h-5" /> Buy with Card
              </Button>
              
              <Button 
                onClick={handleMintWithUSDC}
                variant="outline"
                className="w-full bg-surface border border-primary/50 text-white hover:bg-primary/20 hover:text-white h-12 font-medium flex items-center justify-center gap-2 transition-all"
                disabled={isCancelled || (isSoldOut && !isCancelled) || isMinting}
              >
                {isMinting ? (
                  <><div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div> Minting...</>
                ) : (
                  <><WalletIcon className="w-5 h-5" /> Buy with USDC (Gasless)</>
                )}
              </Button>
            </div>
            
            <p className="text-center text-xs text-text-secondary mt-6 flex items-center justify-center gap-1">
              Protected by <span className="text-primary font-mono font-medium tracking-tight">ZeroDev</span> Account Abstraction
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
