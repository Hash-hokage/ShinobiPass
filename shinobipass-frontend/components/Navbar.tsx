"use client";

import Link from "next/link";
import { useSmartWallet } from "@/hooks/useSmartWallet";
import { PlusIcon, X, Mail, Wallet, Loader2 } from "lucide-react";
import { useState } from "react";
import { useConnect } from "wagmi";
import { injected } from "wagmi/connectors";

export function Navbar() {
  const { isConnected, isConnecting, address, connect, disconnect } = useSmartWallet();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { connectAsync } = useConnect();

  const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const handleWalletConnect = async () => {
    try {
      // 1. Trigger the EOA connection via wagmi (MetaMask / browser extension)
      await connectAsync({ connector: injected() });
      // 2. Close the modal — the useEffect in ZeroDevWrapper will handle the rest
      setIsModalOpen(false);
      // 3. The smart wallet hook's useEffect will auto-trigger ZeroDev setup
      //    once walletClient resolves, so we just call connect() as a fallback
      await connect();
    } catch (e) {
      console.error("[ShinobiPass] Auth modal connection error:", e);
    }
  };

  return (
    <>
      <nav className="bg-background/80 backdrop-blur-xl font-headline font-bold tracking-tight fixed top-0 w-full z-50 border-b border-white/5 shadow-glow">
        <div className="flex justify-between items-center px-8 h-20 w-full max-w-7xl mx-auto">
          <Link href="/" className="text-2xl font-bold tracking-tighter text-primary hover:opacity-80 transition-opacity">
            ShinobiPass
          </Link>
          
          <div className="hidden md:flex gap-10 items-center font-body font-medium text-sm">
            <Link href="/events" className="text-white hover:text-[#7c5cfc] transition-colors">Explore</Link>
            <Link href="/organizer/create" className="text-white hover:text-[#7c5cfc] transition-colors">Create</Link>
            <Link href="#" className="text-white hover:text-[#7c5cfc] transition-colors">Docs</Link>
          </div>

          <div className="flex items-center gap-4">
            {isConnecting ? (
              /* --- Loading state: ZeroDev is setting up the smart account --- */
              <button 
                disabled
                className="px-6 py-2 rounded-full border border-[#7c5cfc]/30 bg-[#7c5cfc]/10 text-[#947dff] font-body font-medium cursor-not-allowed flex items-center gap-2"
              >
                <Loader2 className="w-4 h-4 animate-spin" />
                Connecting…
              </button>
            ) : !isConnected ? (
              /* --- Not connected: show Sign In button --- */
              <button 
                onClick={() => setIsModalOpen(true)} 
                className="px-6 py-2 rounded-full border border-[#7c5cfc]/30 bg-[#7c5cfc]/10 hover:bg-[#7c5cfc]/20 text-[#947dff] transition-all shadow-[0_0_15px_rgba(124,85,247,0.15)] hover:shadow-[0_0_25px_rgba(124,85,247,0.3)] font-body font-medium active:scale-95"
              >
                Sign In
              </button>
            ) : (
              /* --- Connected: show address + actions --- */
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

      {/* Authentication Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0d0d1a] border border-white/10 rounded-2xl w-full max-w-md p-8 relative animate-in fade-in zoom-in duration-300">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Welcome to ShinobiPass</h2>
              <p className="text-gray-400">Choose how you want to sign in.</p>
            </div>

            <div className="flex flex-col gap-4">
              <button 
                disabled={true}
                className="bg-white text-black opacity-50 cursor-not-allowed w-full py-3.5 rounded-xl font-semibold flex items-center px-6 gap-2 transition-colors"
              >
                <Mail className="w-5 h-5" />
                <span>Continue with Email / Google</span>
                <span className="text-[10px] uppercase tracking-wider bg-purple-500/20 text-purple-500 px-2 py-0.5 rounded-full ml-auto">Coming Soon</span>
              </button>

              <button 
                onClick={handleWalletConnect}
                className="bg-white/5 border border-white/10 text-white hover:bg-white/10 w-full py-3.5 rounded-xl font-semibold flex justify-center items-center gap-2 transition-colors"
              >
                <Wallet className="w-5 h-5" />
                Connect Web3 Wallet
              </button>
            </div>

            <p className="text-center text-xs text-gray-500 mt-6 px-4">
              By connecting, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
