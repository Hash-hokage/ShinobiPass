"use client";

import Link from "next/link";
import { useSmartWallet } from "@/hooks/useSmartWallet";
import { PlusIcon, TicketIcon, LayoutDashboardIcon } from "lucide-react";

export function Navbar() {
  const { isConnected, address, connect, disconnect } = useSmartWallet();

  const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <nav className="bg-background/80 backdrop-blur-xl font-headline font-bold tracking-tight fixed top-0 w-full z-50 shadow-glow">
      <div className="flex justify-between items-center px-8 h-20 w-full max-w-7xl mx-auto">
        <Link href="/" className="text-2xl font-bold tracking-tighter text-primary">
          ShinobiPass
        </Link>
        
        <div className="hidden md:flex gap-8 items-center font-body font-medium text-sm">
          <Link href="/events" className="text-text-secondary hover:text-primary transition-all duration-300 hover:bg-surface-container-high/50 px-3 py-2 rounded">Explore</Link>
          {isConnected && (
            <>
              <Link href="/my-tickets" className="text-text-secondary hover:text-primary transition-all duration-300 hover:bg-surface-container-high/50 px-3 py-2 rounded flex items-center gap-1.5">
                <TicketIcon className="w-4 h-4" /> Tickets
              </Link>
              <Link href="/organizer" className="text-text-secondary hover:text-primary transition-all duration-300 hover:bg-surface-container-high/50 px-3 py-2 rounded flex items-center gap-1.5">
                <LayoutDashboardIcon className="w-4 h-4" /> Organizer
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-4">
          {!isConnected ? (
            <button 
              onClick={() => connect()} 
              className="bg-gradient-to-br from-[#7c5cfc] to-[#947dff] text-white px-6 py-2.5 rounded-lg font-body font-medium hover:opacity-90 active:scale-95 transition-transform"
            >
              Sign In
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/organizer/create">
                <button className="hidden sm:flex items-center text-text-secondary hover:text-primary px-3 py-2 rounded font-body font-medium text-sm transition-colors gap-1.5">
                  <PlusIcon className="w-4 h-4" /> New Event
                </button>
              </Link>
              <div 
                className="px-4 py-2 rounded-full bg-surface-container-high border border-outline-variant/15 text-primary font-label text-xs cursor-pointer hover:bg-surface-container-highest transition-colors font-medium"
                onClick={disconnect}
                title="Click to disconnect"
              >
                {address ? truncate(address) : "0x..."}
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
