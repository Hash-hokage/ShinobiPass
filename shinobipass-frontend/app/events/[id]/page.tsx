"use client";

import { useState } from "react";
import { useReadContract } from "wagmi";
import { EVENT_TICKET_ABI, EVENT_TICKET_ADDRESS, USDC_ADDRESS, erc20Abi } from "@/lib/contract";
import { Navbar } from "@/components/Navbar";
import { useSmartWallet } from "@/hooks/useSmartWallet";
import { formatUnits, encodeFunctionData, decodeErrorResult } from "viem";
import { openTransakWidget } from "@/lib/transak";
import { useToast } from "@/hooks/use-toast";

export default function EventDetailPage({ params }: { params: { id: string } }) {
  const eventId = BigInt(params.id);
  const { isConnected, address, connect, sendUserOp, waitForUserOp } = useSmartWallet();
  const [isMinting, setIsMinting] = useState(false);
  const { toast } = useToast();

  const { data: eventInfo } = useReadContract({
    address: EVENT_TICKET_ADDRESS as `0x${string}`,
    abi: EVENT_TICKET_ABI,
    functionName: "events",
    args: [eventId],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as { data: any | undefined };

  if (!eventInfo) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
        <Navbar />
        <div className="flex-1 flex justify-center items-center">
          <div className="animate-pulse flex flex-col items-center gap-4">
             <div className="w-12 h-12 border-4 border-[#7c5cfc] border-t-transparent rounded-full animate-spin"></div>
             <p className="text-gray-400 font-mono text-sm uppercase tracking-widest">Decrypting metadata...</p>
          </div>
        </div>
      </div>
    );
  }

  // ABI Mapping: [name, venue, organizer, escrowBalance, date, price, status, maxSupply, minted, resaleAllowed, royaltyReceiver, resalePriceCap, royaltyFeeBps, imageURI]
  const [
    name,
    venue,
    , // organizer
    , // escrowBalance
    date,
    price,
    status,
    maxSupply,
    minted,
    , // resaleAllowed
    , // royaltyReceiver
    , // resalePriceCap
    , // royaltyFeeBps
    imageURI
  ] = eventInfo;

  const isSoldOut = Number(minted) >= Number(maxSupply);
  const isCancelled = Number(status) === 1;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapContractError = (err: any) => {
    try {
      // Extract revert data if present
      const errorData = err?.data?.data || err?.data || err?.error?.data;
      if (errorData) {
        const decoded = decodeErrorResult({
          abi: EVENT_TICKET_ABI,
          data: errorData as `0x${string}`,
        });

        switch (decoded.errorName) {
          case "EventTicket__EventSoldOut":
            return "Sorry, this event is completely sold out!";
          case "EventTicket__InsufficientPayment":
            return "Transaction failed: Insufficient funds sent.";
          case "EventTicket__ResaleNotAllowed":
            return "The organizer has disabled secondary market sales for this event.";
          case "EventTicket__TicketAlreadyUsed":
            return "This ticket has already been scanned at the door.";
          case "EventTicket__InsufficientAllowance":
            return "USDC allowance insufficient. Please try again.";
          case "EventTicket__EventDoesNotExist":
            return "This event doesn't exist.";
          default:
            return `Contract error: ${decoded.errorName}`;
        }
      }
    } catch (e) {
      console.error("Error decoding contract error:", e);
    }
    return err?.message || "Transaction failed. Please try again or check your wallet balance.";
  };

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

      const userOpHash = await sendUserOp([
        {
           to: USDC_ADDRESS,
           data: approveData
        },
        {
           to: EVENT_TICKET_ADDRESS,
           data: mintData
        }
      ]);

      toast({
        title: "Transaction Sent",
        description: "Processing your ticket minting operation...",
      });

      await waitForUserOp(userOpHash);

      toast({
        title: "Success!",
        description: "Your NFT ticket has been secured in your vault.",
      });
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Minting Failed",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        description: mapContractError(err as any),
      });
    } finally {
      setIsMinting(false);
    }
  };

  const handleBuyWithCard = () => {
    if (!address) return connect();
    openTransakWidget(address);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col relative overflow-hidden">
      {/* Dynamic Background generated from banner if exists, else gradient */}
      {imageURI ? (
        <div 
          className="absolute inset-x-0 top-0 h-[60vh] opacity-10 pointer-events-none blur-3xl mix-blend-screen transition-all"
          style={{ backgroundImage: `url(${imageURI})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0a0a0f]"></div>
        </div>
      ) : (
        <div className="absolute inset-x-0 top-[-20%] h-[50vh] bg-[#7c5cfc]/10 blur-[140px] rounded-full pointer-events-none mix-blend-screen transition-all"></div>
      )}

      <Navbar />

      <main className="flex-1 w-full max-w-7xl mx-auto px-8 py-12 z-10 flex flex-col lg:flex-row gap-12 mt-16">
        {/* Left Column: Image & Details */}
        <div className="flex-1 flex flex-col gap-8">
          <div 
            className="w-full aspect-video rounded-2xl bg-white/5 border border-white/10 overflow-hidden relative shadow-2xl"
            style={imageURI ? { backgroundImage: `url(${imageURI})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
          >
             {!imageURI && (
               <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 flex items-center justify-center">
                 <span className="text-gray-500 font-mono text-sm uppercase tracking-widest">No Image Provided</span>
               </div>
             )}
          </div>
          
          <div className="flex flex-col gap-4">
            <div className={`self-start inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-bold tracking-[0.2em] uppercase border ${isCancelled ? "bg-red-500/10 text-red-400 border-red-500/20" : isSoldOut ? "bg-white/5 text-gray-500 border-white/10" : "bg-[#7c5cfc]/10 text-[#947dff] border-[#7c5cfc]/20"}`}>
               {isCancelled ? "Cancelled" : isSoldOut ? "Sold Out" : "Minting Live"}
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold font-headline text-white leading-tight tracking-tight">
              {name}
            </h1>
            
            <p className="text-gray-400 text-lg font-body leading-relaxed whitespace-pre-wrap mt-2">
              Premium NFT-powered event experience. Secured on Arc with non-custodial ownership.
            </p>
          </div>
        </div>

        {/* Right Column: Checkout Panel */}
        <div className="w-full lg:w-96 flex-shrink-0">
          <div className="sticky top-32 bg-white/5 backdrop-blur-md p-8 rounded-2xl border border-white/10 shadow-2xl flex flex-col gap-8">
            <h3 className="font-bold font-headline text-2xl text-white leading-tight border-b border-white/5 pb-6">Secure Checkout</h3>
            
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                  <span className="material-symbols-outlined text-[#7c5cfc]">calendar_month</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-500 font-body text-[10px] uppercase tracking-wider mb-0.5">Date & Time</span>
                  <span className="font-mono text-white text-sm uppercase">{new Date(Number(date) * 1000).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                  <span className="material-symbols-outlined text-[#7c5cfc]">location_on</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-500 font-body text-[10px] uppercase tracking-wider mb-0.5">Venue</span>
                  <span className="text-white text-sm font-body">{venue}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                  <span className="material-symbols-outlined text-[#7c5cfc]">confirmation_number</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-500 font-body text-[10px] uppercase tracking-wider mb-0.5">Availability</span>
                  <span className="font-mono text-white text-sm">
                    {Number(minted)} / {Number(maxSupply)} minted
                  </span>
                </div>
              </div>
            </div>
            
            <div className="bg-white/5 rounded-xl p-6 border border-white/10 flex justify-between items-center mt-2">
               <span className="text-gray-400 font-body text-sm font-medium">Price</span>
               <span className="text-3xl font-bold font-mono text-[#7c5cfc]">{formatUnits(price, 6)} <span className="text-base text-[#7c5cfc]/70">USDC</span></span>
            </div>
            
            <div className="flex flex-col gap-4 mt-2">
              <button 
                onClick={handleBuyWithCard}
                className="w-full bg-white text-black py-4 rounded-xl font-bold font-body transition-all hover:bg-gray-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                disabled={isCancelled || (isSoldOut && !isCancelled)}
              >
                <span className="material-symbols-outlined text-[20px]">credit_card</span> Buy with Card
              </button>
              
              <button 
                onClick={handleMintWithUSDC}
                className="w-full bg-[#7c5cfc]/10 text-[#947dff] border border-[#7c5cfc]/20 hover:bg-[#7c5cfc]/20 py-4 rounded-xl font-bold font-body transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                disabled={isCancelled || (isSoldOut && !isCancelled) || isMinting}
              >
                {isMinting ? (
                  <><div className="w-5 h-5 border-2 border-[#7c5cfc]/50 border-t-[#7c5cfc] rounded-full animate-spin"></div> Processing...</>
                ) : (
                  <><span className="material-symbols-outlined text-[20px]">account_balance_wallet</span> Buy with USDC (Gasless)</>
                )}
              </button>
            </div>
            
            <p className="text-center text-[10px] text-gray-500 flex items-center justify-center gap-1 font-body uppercase tracking-[0.2em]">
              Secured by <span className="text-[#7c5cfc] font-mono font-bold">ZeroDev</span>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
