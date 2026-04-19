"use client";

import Link from "next/link";
import { formatUnits } from "viem";

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
  const price = formatUnits(event.ticketPrice, 6);

  const fallbackImage = "https://lh3.googleusercontent.com/aida-public/AB6AXuBgqlUinDUjFZOxj13fB_brlLHsvUL4A0SQVLNsdSe9G_w7UT5hg_QUOKEFP6uhKp8yzq2a-ClQ0o9p0dpEZ8FHerayBkNdJr99xfjrk0Otjw9uugKZfIO0uTOYbl3j9WlmOGL4DWt9xQcNMzLl6kXetmGi0MD37CDnFefln0LK7oFjn4tXlRe895YE7hGT8JJBjc22E9LAhE9ximWpb3A2CVAXiihz02LOPi7RxAagtcFZzT5qGfrXlAL7Y5UG1MipuTEBd7gzci3m";

  return (
    <div className="flex flex-col bg-surface-container-lowest rounded-xl overflow-hidden border-outline-variant/15 border-transparent border-[1px] hover:shadow-glow hover:-translate-y-1 transition-all duration-300 group cursor-pointer">
      <div className="relative h-48 w-full overflow-hidden">
        <img 
          alt="Event Image" 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
          src={event.bannerUrl || fallbackImage}
        />
        <div className="absolute top-4 left-4">
          <span className={`inline-flex items-center px-3 py-1 rounded-full font-mono text-xs font-bold tracking-wider uppercase ${isCancelled ? "bg-error-container text-on-error-container" : isSoldOut ? "bg-surface-container-high text-on-surface-variant" : "bg-primary-container text-on-primary-container"}`}>
            {isCancelled ? "CANCELLED" : isSoldOut ? "SOLD OUT" : "UPCOMING"}
          </span>
        </div>
      </div>
      <div className="p-6 flex flex-col gap-6 flex-1">
        <div className="flex flex-col gap-2">
          <p className="text-primary font-mono text-xs uppercase tracking-widest font-bold">
            {new Date(event.date * 1000).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })} · {new Date(event.date * 1000).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
          </p>
          <h3 className="text-xl font-bold font-headline text-on-surface leading-tight truncate">{event.name}</h3>
          <p className="text-on-surface-variant text-sm flex items-center gap-1 font-body truncate">
            <span className="material-symbols-outlined text-[16px]">location_on</span>
            {event.description}
          </p>
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-outline-variant/15 mt-auto">
          <div className="flex flex-col">
            <span className="text-on-surface-variant text-xs font-body mb-1">Price</span>
            <span className="text-secondary font-mono font-medium text-lg">{price} USDC</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-on-surface-variant text-xs font-body mb-1">Availability</span>
            <span className="text-on-surface font-mono text-sm">{Math.max(0, event.maxSupply - event.minted)} / {event.maxSupply}</span>
          </div>
        </div>
        <Link href={`/events/${event.id}`} className="w-full mt-2">
          <button 
            className={`w-full py-3 rounded font-bold transition-colors font-body ${isSoldOut ? "bg-transparent text-on-surface-variant border border-outline-variant hover:bg-surface-container-high opacity-70" : "bg-transparent text-primary hover:bg-primary/5 border border-outline-variant/15"}`}
          >
            {isSoldOut ? "Waitlist" : "View Event"}
          </button>
        </Link>
      </div>
    </div>
  );
}
