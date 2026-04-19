"use client";

import Link from "next/link";
import { useSmartWallet } from "@/hooks/useSmartWallet";
import { Button } from "@/components/ui/button";
import { PlusIcon, TicketIcon, LayoutDashboardIcon } from "lucide-react";

export function Navbar() {
  const { isConnected, address, connect, disconnect } = useSmartWallet();

  const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-border bg-surface/80 backdrop-blur-xl">
      <div className="container mx-auto px-4 h-16 w-full flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <div className="h-8 w-8 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow">
            <span className="text-white font-bold text-lg font-mono leading-none">S</span>
          </div>
          <span className="text-white font-bold text-xl tracking-tight hidden sm:block">
            ShinobiPass
          </span>
        </Link>
        
        <div className="flex items-center gap-6 text-sm text-text-secondary font-medium">
          <Link href="/events" className="hover:text-white transition-colors">Explore</Link>
          {isConnected && (
            <>
              <Link href="/my-tickets" className="hover:text-white transition-colors flex items-center gap-1.5">
                <TicketIcon className="w-4 h-4" /> Tickets
              </Link>
              <Link href="/organizer" className="hover:text-white transition-colors flex items-center gap-1.5">
                <LayoutDashboardIcon className="w-4 h-4" /> Organizer
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-4">
          {!isConnected ? (
            <Button 
              onClick={() => connect()} 
              className="bg-primary hover:bg-primary/90 text-white shadow-glow-hover transition-all"
            >
              Connect Wallet
            </Button>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/organizer/create">
                <Button variant="outline" size="sm" className="hidden sm:flex border-border hover:bg-white/5 h-9 gap-1.5">
                  <PlusIcon className="w-4 h-4" /> New Event
                </Button>
              </Link>
              <div 
                className="px-3 py-1.5 rounded-full bg-elevated border border-border/50 text-white font-mono text-xs cursor-pointer hover:bg-white/5 transition-colors"
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
