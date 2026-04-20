"use client";

import { useState } from "react";
import { useReadContract } from "wagmi";
import { EVENT_TICKET_ABI, EVENT_TICKET_ADDRESS, USDC_ADDRESS, erc20Abi } from "@/lib/contract";
import { Navbar } from "@/components/Navbar";
import { useSmartWallet } from "@/hooks/useSmartWallet";
import { formatUnits, encodeFunctionData } from "viem";
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
  }) as { data: any | undefined };

  if (!eventInfo) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex justify-center items-center">
          <div className="animate-pulse flex flex-col items-center gap-4">
             <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
             <p className="text-on-surface-variant font-mono text-sm">Decrypting metadata...</p>
          </div>
        </div>
      </div>
    );
  }

  // ABI Mapping: [name, venue, organizer, escrowBalance, date, price, status, maxSupply, minted, resaleAllowed, royaltyReceiver, resalePriceCap, royaltyFeeBps, imageURI]
  const [
    name,
    venue,
    _organizer,
    _escrowBalance,
    date,
    price,
    status,
    maxSupply,
    minted,
    _resaleAllowed,
    _royaltyReceiver,
    _resalePriceCap,
    _royaltyFeeBps,
    imageURI
  ] = eventInfo;

  const isSoldOut = Number(minted) >= Number(maxSupply);
  const isCancelled = Number(status) === 1;

  const handleMintWithUSDC = async () => {
    if (!isConnected) return connect();
    try {
      setIsMinting(true);

      const approveData = encodeFunctionData({
        abi: erc20Abi,
        functionName: 'approve',
        args: [EVENT_TICKET_ADDRESS, price]
      });

      const mintData = encodeFunctionData({
        abi: EVENT_TICKET_ABI,
        functionName: 'mintTicket',
        args: [eventId]
      });

      await sendUserOp([
        {
           to: USDC_ADDRESS,
           data: approveData
        },
        {
           to: EVENT_TICKET_ADDRESS,
           data: mintData
        }
      ]);
      alert("Mint successful!");
    } catch (e: unknown) {
      alert("Failed to mint: " + (err instanceof Error ? err.message : String(err)));
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
          className="absolute inset-x-0 top-0 h-[60vh] opacity-10 pointer-events-none blur-3xl mix-blend-screen transition-all"
          style={{ backgroundImage: `url(${bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background"></div>
        </div>
      ) : (
        <div className="absolute inset-x-0 top-[-20%] h-[50vh] bg-primary/10 blur-[140px] rounded-full pointer-events-none mix-blend-screen transition-all"></div>
      )}

      <Navbar />

      <main className="flex-1 w-full max-w-7xl mx-auto px-8 py-12 z-10 flex flex-col lg:flex-row gap-12 mt-8">
        {/* Left Column: Image & Details */}
        <div className="flex-1 flex flex-col gap-8">
          <div 
            className="w-full aspect-video rounded-2xl bg-surface-container-lowest border border-outline-variant/15 overflow-hidden relative shadow-ambient"
            style={bannerUrl ? { backgroundImage: `url(${bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
          >
             {!bannerUrl && (
               <div className="absolute inset-0 bg-gradient-to-br from-surface to-surface-container-high flex items-center justify-center">
                 <span className="text-on-surface-variant font-mono text-sm uppercase tracking-widest">No Image Provided</span>
               </div>
             )}
          </div>
          
          <div className="flex flex-col gap-4">
            <div className={`self-start inline-flex items-center px-4 py-1.5 rounded-full text-xs font-mono font-bold tracking-wider uppercase border border-outline-variant/15 ${isCancelled ? "bg-error-container text-on-error-container" : isSoldOut ? "bg-surface-container-high text-on-surface-variant" : "bg-primary-container text-on-primary-container"}`}>
               {isCancelled ? "Cancelled" : isSoldOut ? "Sold Out" : "Minting Live"}
            </div>
            <h1 className="text-4xl md:text-5xl font-bold font-headline text-on-surface leading-tight tracking-tight">
              {name}
            </h1>
            
            <p className="text-on-surface-variant text-lg font-body leading-relaxed whitespace-pre-wrap mt-2">
              {desc}
            </p>
          </div>
        </div>

        {/* Right Column: Checkout Panel */}
        <div className="w-full lg:w-96 flex-shrink-0">
          <div className="sticky top-32 bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant/15 shadow-ambient flex flex-col gap-8">
            <h3 className="font-bold font-headline text-2xl text-on-surface leading-tight border-b border-outline-variant/15 pb-6">Secure Checkout</h3>
            
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center border border-outline-variant/15">
                  <span className="material-symbols-outlined text-primary">calendar_month</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-on-surface-variant font-body text-xs mb-0.5">Date & Time</span>
                  <span className="font-mono text-on-surface text-sm uppercase">{new Date(date * 1000).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center border border-outline-variant/15">
                  <span className="material-symbols-outlined text-primary">location_on</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-on-surface-variant font-body text-xs mb-0.5">Location</span>
                  <span className="text-on-surface text-sm font-body">Location metadata</span>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center border border-outline-variant/15">
                  <span className="material-symbols-outlined text-primary">confirmation_number</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-on-surface-variant font-body text-xs mb-0.5">Availability</span>
                  <span className="font-mono text-on-surface text-sm">
                    {minted} / {maxSupply} minted
                  </span>
                </div>
              </div>
            </div>
            
            <div className="bg-surface-container rounded-xl p-6 border border-outline-variant/15 flex justify-between items-center mt-2">
               <span className="text-on-surface-variant font-body text-sm font-medium">Price</span>
               <span className="text-3xl font-bold font-mono text-secondary">{formatUnits(price, 6)} <span className="text-base text-secondary/70">USDC</span></span>
            </div>
            
            <div className="flex flex-col gap-4 mt-2">
              <button 
                onClick={handleBuyWithCard}
                className="w-full bg-on-surface text-surface py-3 rounded font-bold font-body transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-on-surface/90 flex items-center justify-center gap-2"
                disabled={isCancelled || (isSoldOut && !isCancelled)} /* Demo assumption */
              >
                <span className="material-symbols-outlined text-[20px]">credit_card</span> Buy with Card
              </button>
              
              <button 
                onClick={handleMintWithUSDC}
                className="w-full bg-transparent text-primary border border-primary/30 hover:bg-primary/5 py-3 rounded font-bold font-body transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                disabled={isCancelled || (isSoldOut && !isCancelled) || isMinting}
              >
                {isMinting ? (
                  <><div className="w-5 h-5 border-2 border-primary/50 border-t-primary rounded-full animate-spin"></div> Minting...</>
                ) : (
                  <><span className="material-symbols-outlined text-[20px]">account_balance_wallet</span> Buy with USDC (Gasless)</>
                )}
              </button>
            </div>
            
            <p className="text-center text-xs text-on-surface-variant flex items-center justify-center gap-1 font-body">
              Protected by <span className="text-primary font-mono font-bold tracking-widest uppercase">ZeroDev</span>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
