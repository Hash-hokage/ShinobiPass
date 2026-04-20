"use client";

import { useState } from "react";
import { EVENT_TICKET_ABI, EVENT_TICKET_ADDRESS } from "@/lib/contract";
import { useSmartWallet } from "@/hooks/useSmartWallet";
import { Navbar } from "@/components/Navbar";
import { parseUnits, encodeFunctionData } from "viem";

export default function CreateEventPage() {
  const { isConnected, address, sendUserOp, connect } = useSmartWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    date: "",
    maxSupply: "100",
    ticketPrice: "10",
    isResaleAllowed: true,
    resaleCapMultiplier: "200", // 200% (2x)
    usdcRecipient: "",
    releaseDelay: "86400", // 1 day
    bannerUrl: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !address) return alert("Please connect wallet first");
    
    setIsSubmitting(true);
    try {
      const dateUnix = BigInt(Math.floor(new Date(form.date).getTime() / 1000));
      const priceWei = parseUnits(form.ticketPrice, 6);
      const usdcRecipient = (form.usdcRecipient || address) as `0x${string}`;
      const maxSupply = BigInt(form.maxSupply);
      const resalePriceCap = (priceWei * BigInt(form.resaleCapMultiplier)) / 100n;
      
      const data = encodeFunctionData({
        abi: EVENT_TICKET_ABI,
        functionName: 'createEvent',
        args: [
          form.name,
          form.description, // using description as venue for MVP
          dateUnix,
          priceWei,
          maxSupply,
          form.isResaleAllowed,
          resalePriceCap,
          usdcRecipient,
          500, // Default 5% royalty fee (500 bps)
          form.bannerUrl
        ]
      });
      
      await sendUserOp([
         {
           to: EVENT_TICKET_ADDRESS,
           data
         }
      ]);
      
      alert("Event created successfully! Check dashboard.");
      // router.push("/organizer");
    } catch (err: unknown) {
      alert("Creation failed: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-8">
           <div className="bg-surface-container-lowest p-10 rounded-2xl text-center max-w-md w-full border border-outline-variant/15 shadow-ambient flex flex-col items-center">
             <span className="material-symbols-outlined text-[48px] text-primary mb-4">analytics</span>
             <h2 className="text-2xl font-bold font-headline text-on-surface mb-2">Organizer Dashboard</h2>
             <p className="text-on-surface-variant font-body mb-8">Connect your wallet to manage your events.</p>
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
      {/* Glow background */}
      <div className="absolute top-0 left-[-10%] w-[40%] h-[60%] bg-primary/10 blur-[150px] rounded-full pointer-events-none mix-blend-screen transition-all"></div>

      <Navbar />
      <main className="flex-1 w-full max-w-3xl mx-auto px-8 py-12 flex flex-col gap-12 mt-8 z-10 relative">
        <div className="flex flex-col gap-2 border-b border-outline-variant/15 pb-8">
          <h1 className="text-5xl font-bold font-headline text-on-surface tracking-tight">Initialize Event Vault</h1>
          <p className="text-on-surface-variant font-body text-lg">Deploy a new highly-secure ticket contract for your event.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="bg-surface-container-lowest p-8 md:p-10 rounded-2xl border border-outline-variant/15 shadow-ambient flex flex-col gap-8">
          
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium font-body uppercase tracking-wider text-on-surface-variant">Event Name</label>
            <input 
              required
              type="text" 
              className="bg-surface-container-high border border-outline-variant/30 px-4 py-3.5 rounded-lg text-on-surface focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-colors placeholder:text-on-surface-variant/30 font-body placeholder:font-body"
              placeholder="e.g. Neo-Tokyo Summit 2026"
              value={form.name}
              onChange={e => setForm({...form, name: e.target.value})}
            />
          </div>
          
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium font-body uppercase tracking-wider text-on-surface-variant">Description</label>
            <textarea 
              required
              rows={4}
              className="bg-surface-container-high border border-outline-variant/30 px-4 py-3.5 rounded-lg text-on-surface focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-colors placeholder:text-on-surface-variant/30 font-body placeholder:font-body resize-y min-h-[120px]"
              placeholder="Event details, location, schedule..."
              value={form.description}
              onChange={e => setForm({...form, description: e.target.value})}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium font-body uppercase tracking-wider text-on-surface-variant">Date & Time</label>
              <input 
                required
                type="datetime-local" 
                className="bg-surface-container-high border border-outline-variant/30 px-4 py-3.5 rounded-lg text-on-surface focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-colors font-mono"
                value={form.date}
                onChange={e => setForm({...form, date: e.target.value})}
              />
            </div>
            
            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium font-body uppercase tracking-wider text-on-surface-variant">Ticket Price (USDC)</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50">payments</span>
                <input 
                  required
                  type="number" 
                  min="0"
                  step="0.01"
                  className="w-full bg-surface-container-high border border-outline-variant/30 pl-12 pr-4 py-3.5 rounded-lg text-on-surface focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-colors font-mono"
                  value={form.ticketPrice}
                  onChange={e => setForm({...form, ticketPrice: e.target.value})}
                />
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium font-body uppercase tracking-wider text-on-surface-variant">Max Supply</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50">confirmation_number</span>
                <input 
                  required
                  type="number" 
                  min="1"
                  className="w-full bg-surface-container-high border border-outline-variant/30 pl-12 pr-4 py-3.5 rounded-lg text-on-surface focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-colors font-mono"
                  value={form.maxSupply}
                  onChange={e => setForm({...form, maxSupply: e.target.value})}
                />
              </div>
            </div>
            
            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium font-body uppercase tracking-wider text-on-surface-variant">USDC Recipient Address</label>
              <input 
                type="text" 
                className="bg-surface-container-high border border-outline-variant/30 px-4 py-3.5 rounded-lg text-on-surface focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-colors font-mono placeholder:text-on-surface-variant/30"
                placeholder={address || "0x..."}
                value={form.usdcRecipient}
                onChange={e => setForm({...form, usdcRecipient: e.target.value})}
              />
            </div>
          </div>
          
          <div className="pt-8 border-t border-outline-variant/15 flex flex-col gap-6 mt-4">
             <div className="flex items-center justify-between">
                <div>
                   <label className="text-base font-bold font-headline text-on-surface mb-1 block">Allow Secondary Market Resales</label>
                   <p className="text-sm font-body text-on-surface-variant">Attendees can resell tickets in the secure marketplace.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={form.isResaleAllowed}
                    onChange={e => setForm({...form, isResaleAllowed: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-surface-container-high rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-on-surface after:border-on-surface after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
             </div>
             
             {form.isResaleAllowed && (
               <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-surface-container-high/50 p-6 rounded-xl border border-outline-variant/20 gap-4 transition-all">
                  <div>
                    <label className="text-sm font-bold font-headline text-on-surface mb-1 block">Resale Cap Multiplier (%)</label>
                    <p className="text-xs font-body text-on-surface-variant">E.g., 200 = Cannot be sold for more than 2x original price.</p>
                  </div>
                  <div className="relative flex-shrink-0 w-full md:w-32">
                    <input 
                      type="number" 
                      min="100"
                      className="w-full bg-surface-container border border-outline-variant/30 px-4 py-2.5 rounded-lg text-on-surface focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 text-right font-mono pr-8"
                      value={form.resaleCapMultiplier}
                      onChange={e => setForm({...form, resaleCapMultiplier: e.target.value})}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-mono text-sm">%</span>
                  </div>
               </div>
             )}
          </div>
          
          <button 
            disabled={isSubmitting}
            className="w-full mt-6 bg-primary hover:bg-primary/90 text-on-primary shadow-ambient h-14 text-lg font-bold font-body rounded transition-colors flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <><div className="w-5 h-5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin mr-3"></div> Deploying Vault...</>
            ) : "Sign & Deploy Event"}
          </button>
        </form>
      </main>
    </div>
  );
}
