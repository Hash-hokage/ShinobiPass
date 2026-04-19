"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function TransakFallbackModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setOpen(true);
    window.addEventListener("open-transak-fallback", handleOpen);
    return () => window.removeEventListener("open-transak-fallback", handleOpen);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md p-6 glass-panel rounded-xl shadow-glow overflow-hidden">
        {/* Subtle top gradient accent */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary"></div>
        
        <h2 className="text-xl font-bold font-sans text-white mb-4">Card Payments Coming Soon</h2>
        <p className="text-text-secondary text-sm mb-6">
          For now, get testnet USDC free from faucet.circle.com — select Arc Testnet and request up to 20 USDC every 2 hours.
        </p>
        
        <div className="flex gap-3 justify-end">
          <Button variant="outline" className="border-border text-white hover:bg-white/5" onClick={() => setOpen(false)}>
            Close
          </Button>
          <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer">
            <Button className="bg-primary text-white hover:opacity-90 shadow-glow-hover transition-all">
              Go to Faucet
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}
