"use client";

import Link from "next/link";
import { formatUnits } from "viem";
import { CalendarIcon, MapPinIcon, TicketIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export type EventStatus = "Active" | "Cancelled" | "Completed";

export interface EventType {
  id: number;
  name: string;
  description: string;
  organizer: string;
  date: number;
  maxSupply: number;
  minted: number;
  status: number; // 0: Active, 1: Cancelled, 2: Completed
  ticketPrice: bigint;
  resaleCapMultiplier: number;
  isResaleAllowed: boolean;
  usdcRecipient: string;
  escrowBalance: bigint;
  releaseDelay: number;
  bannerUrl: string;
}

export function EventCard({ event }: { event: EventType }) {
  const isSoldOut = event.minted >= event.maxSupply;
  const isCancelled = event.status === 1;
  const price = formatUnits(event.ticketPrice, 6); // USDC has 6 decimals, but the contract uses 18 if mocked, wait. The prompt said standard USDC, so 6. We use formatUnits(..., 6). Actually Arc USDC might be 6 standard.

  const bgStyle = event.bannerUrl ? { backgroundImage: `url(${event.bannerUrl})`, backgroundSize: 'cover' } : {};

  return (
    <div className="glass-panel rounded-xl overflow-hidden shadow-glow transition-all hover:scale-[1.02] hover:shadow-glow-hover flex flex-col h-full border border-border/50">
      <div 
        className="h-40 w-full relative bg-gradient-to-br from-primary/30 to-surface border-b border-border/30"
        style={bgStyle}
      >
        <div className="absolute top-3 right-3 bg-surface/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-mono font-medium border border-border/50 flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${isCancelled ? "bg-danger" : isSoldOut ? "bg-warning" : "bg-teal animate-pulse"}`}></span>
          {isCancelled ? "Cancelled" : isSoldOut ? "Sold Out" : "Active"}
        </div>
      </div>
      
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-bold text-xl text-white mb-2 line-clamp-1">{event.name}</h3>
        
        <div className="space-y-2 mb-6">
          <div className="flex items-center gap-2 text-text-secondary text-sm">
            <CalendarIcon className="w-4 h-4 text-primary" />
            <span>{new Date(event.date * 1000).toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2 text-text-secondary text-sm">
            <MapPinIcon className="w-4 h-4 text-primary" />
            <span className="line-clamp-1">{event.description.substring(0, 30)}...</span> {/* Dummy location or description */}
          </div>
          <div className="flex items-center justify-between text-sm mt-3 pt-3 border-t border-border/50">
            <div className="flex items-center gap-1.5 text-text-secondary font-mono">
              <TicketIcon className="w-4 h-4 text-teal" />
              <span>{event.maxSupply - event.minted} Left</span>
            </div>
            <div className="font-mono font-bold text-white">
              {price} USDC
            </div>
          </div>
        </div>
        
        <div className="mt-auto">
          <Link href={`/events/${event.id}`} className="w-full">
            <Button className="w-full bg-primary hover:bg-primary/90 text-white shadow-glow transition-all" disabled={isCancelled}>
              {isSoldOut ? "View Resale" : "Buy Ticket"}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
