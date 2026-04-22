"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { arcTestnet } from "@/lib/contract";
import { ZeroDevWrapper } from "@/hooks/useSmartWallet";
import { useState } from "react";

export const config = createConfig({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chains: [arcTestnet as any],
  connectors: [injected()],
  transports: {
    [arcTestnet.id]: http(),
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ZeroDevWrapper>
          {children}
        </ZeroDevWrapper>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
