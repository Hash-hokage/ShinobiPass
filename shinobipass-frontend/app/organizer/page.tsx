"use client";


import { useSmartWallet } from "@/hooks/useSmartWallet";
import { Navbar } from "@/components/Navbar";
import { LineChartIcon, PlusIcon, ScanLineIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function OrganizerDashboard() {
  const { isConnected, connect } = useSmartWallet();
  
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-8">
           <div className="glass-panel p-10 rounded-xl text-center max-w-md w-full border border-border/50">
             <LineChartIcon className="w-12 h-12 text-primary mx-auto mb-4" />
             <h2 className="text-2xl font-bold text-white mb-2">Organizer Dashboard</h2>
             <p className="text-text-secondary mb-6">Connect your wallet to manage your events.</p>
             <Button onClick={() => connect()} className="w-full bg-primary hover:bg-primary/90 text-white shadow-glow">
               Connect Wallet
             </Button>
           </div>
        </div>
      </div>
    );
  }

  // Dashboard fetches and filters events using the smart contract would go here.
  // For brevity and MVP, we show scaffolding for the create route.

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      <div className="absolute top-0 right-[-10%] w-[30%] h-[50%] bg-teal/10 blur-[150px] rounded-full pointer-events-none"></div>
      
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-12 z-10">
        <div className="flex items-center justify-between border-b border-border/50 pb-6 mb-8">
           <h1 className="text-3xl font-bold font-sans text-white tracking-tight">Organizer Terminal</h1>
           <Link href="/organizer/create">
             <Button className="bg-primary hover:bg-primary/90 text-white shadow-glow gap-2 h-10">
               <PlusIcon className="w-4 h-4" /> Create Event
             </Button>
           </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
           <div className="glass-panel p-6 rounded-xl border border-border/50 relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none"></div>
             <p className="text-text-secondary text-sm font-medium mb-2">Total Sales</p>
             <p className="text-3xl font-mono font-bold text-white">0.00 <span className="text-sm text-primary">USDC</span></p>
           </div>
           <div className="glass-panel p-6 rounded-xl border border-border/50 relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-br from-teal/5 to-transparent pointer-events-none"></div>
             <p className="text-text-secondary text-sm font-medium mb-2">Tickets Minted</p>
             <p className="text-3xl font-mono font-bold text-white">0 <span className="text-sm text-teal">TXs</span></p>
           </div>
           <div className="glass-panel p-6 rounded-xl border border-border/50 flex flex-col justify-between">
             <div>
               <p className="text-text-secondary text-sm font-medium mb-2">Scan & Validate</p>
               <p className="text-xs text-text-secondary/70">Access validator dashboard for your events.</p>
             </div>
             <Button variant="outline" className="w-full mt-4 border-border hover:bg-white/5 gap-2">
               <ScanLineIcon className="w-4 h-4" /> Open Scanner
             </Button>
           </div>
        </div>

        <h2 className="text-xl font-bold text-white mb-6">Your Events</h2>
        <div className="text-center py-24 glass-panel rounded-xl border border-border/30 border-dashed">
             <span className="text-4xl mb-4 block">📈</span>
             <h3 className="text-xl font-bold text-white mb-2">No events created</h3>
             <p className="text-text-secondary">Deploy your first event to start accepting ticket purchases securely on-chain.</p>
        </div>
      </main>
    </div>
  );
}
