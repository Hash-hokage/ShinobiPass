"use client";

import { useSmartWallet } from "@/hooks/useSmartWallet";
import { Navbar } from "@/components/Navbar";
import Link from "next/link";

export default function OrganizerDashboard() {
  const { isConnected, connect } = useSmartWallet();
  
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

  // Dashboard fetches and filters events using the smart contract would go here.
  // For brevity and MVP, we show scaffolding for the create route.

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      <div className="absolute top-0 right-[-10%] w-[40%] h-[60%] bg-secondary/10 blur-[150px] rounded-full pointer-events-none mix-blend-screen transition-all"></div>
      
      <Navbar />

      <main className="flex-1 w-full max-w-7xl mx-auto px-8 py-12 z-10 flex flex-col gap-12 mt-8">
        <div className="flex items-center justify-between border-b border-outline-variant/15 pb-8">
           <div className="flex flex-col gap-2">
             <h1 className="text-5xl font-bold font-headline text-on-surface tracking-tight">Organizer Terminal</h1>
             <p className="text-on-surface-variant font-body mb-2">Manage events, track revenue, and control access.</p>
           </div>
           <Link href="/organizer/create">
             <button className="bg-primary hover:bg-primary/90 text-on-primary font-bold font-body px-6 py-3 rounded shadow-ambient flex items-center gap-2 transition-all">
               <span className="material-symbols-outlined text-[20px]">add</span> Create Event
             </button>
           </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-4">
           {/* Stat Card 1 */}
           <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/15 relative overflow-hidden hover:shadow-glow transition-all hover:-translate-y-1 duration-300">
             <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none"></div>
             <div className="flex items-center gap-2 mb-4 text-on-surface-variant">
               <span className="material-symbols-outlined text-[20px]">payments</span>
               <p className="text-sm font-medium font-body uppercase tracking-wider">Total Sales</p>
             </div>
             <p className="text-4xl font-mono font-bold text-on-surface">0.00 <span className="text-sm text-primary">USDC</span></p>
           </div>
           
           {/* Stat Card 2 */}
           <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/15 relative overflow-hidden hover:shadow-glow transition-all hover:-translate-y-1 duration-300">
             <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent pointer-events-none"></div>
             <div className="flex items-center gap-2 mb-4 text-on-surface-variant">
               <span className="material-symbols-outlined text-[20px]">confirmation_number</span>
               <p className="text-sm font-medium font-body uppercase tracking-wider">Tickets Minted</p>
             </div>
             <p className="text-4xl font-mono font-bold text-on-surface">0 <span className="text-sm text-secondary">TXs</span></p>
           </div>
           
           {/* Action Card */}
           <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/15 flex flex-col justify-between hover:shadow-glow transition-all hover:-translate-y-1 duration-300">
             <div>
               <div className="flex items-center gap-2 mb-2 text-on-surface-variant">
                 <span className="material-symbols-outlined text-[20px]">qr_code_scanner</span>
                 <p className="text-sm font-medium font-body uppercase tracking-wider">Scan & Validate</p>
               </div>
               <p className="text-xs text-on-surface-variant/70 font-body leading-relaxed mb-4">Access validator dashboard for your events.</p>
             </div>
             <button className="w-full mt-4 bg-transparent border border-outline-variant hover:bg-surface-container-high py-2.5 rounded text-on-surface-variant font-bold font-body transition-colors flex items-center justify-center gap-2">
               <span className="material-symbols-outlined text-[18px]">document_scanner</span> Open Scanner
             </button>
           </div>
        </div>

        <div className="flex flex-col gap-6">
          <h2 className="text-2xl font-bold font-headline text-on-surface">Your Events</h2>
          <div className="text-center py-32 bg-surface-container-lowest rounded-2xl border border-outline-variant/15 border-dashed flex flex-col items-center">
               <span className="text-5xl mb-6 block mix-blend-luminosity opacity-80">📈</span>
               <h3 className="text-xl font-bold font-headline text-on-surface mb-2">No events created</h3>
               <p className="text-on-surface-variant font-body mt-2">Deploy your first event to start accepting ticket purchases securely on-chain.</p>
               <Link href="/organizer/create" className="mt-6">
                 <button className="text-primary font-mono text-xs uppercase tracking-widest hover:underline decoration-primary underline-offset-4 bg-transparent">Deploy Contract -{'>'}</button>
               </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
