"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { createPublicClient, http } from "viem";
import { 
  createKernelAccountClient, 
  createZeroDevPaymasterClient, 
  createKernelAccount 
} from "@zerodev/sdk";
import { KERNEL_V3_1 } from "@zerodev/sdk/constants";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import { arcTestnet } from "@/lib/contract";
import { useToast } from "./use-toast";
import { useAccount, useWalletClient, useDisconnect } from "wagmi";

// ERC-4337 EntryPoint v0.7 address
const ENTRYPOINT_ADDRESS_V07 = "0x0000000071727De22E5E9d8BAf0edAc6f37da032" as const;

type SmartWalletContextType = {
  smartAccount: any;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  address: string | undefined;
  eoaAddress: string | undefined;
  connect: () => Promise<void>;
  disconnect: () => void;
  sendUserOp: (calls: { to: string; value?: bigint; data: string }[]) => Promise<string>;
  waitForUserOp: (userOpHash: string) => Promise<any>;
};

const SmartWalletContext = createContext<SmartWalletContextType>({} as any);

const PROJECT_ID = process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID || "e0b8e475-ae6f-42cf-9c70-fb5651ad228c";
const bundlerUrl = `https://rpc.zerodev.app/api/v2/bundler/${PROJECT_ID}`;
const paymasterUrl = `https://rpc.zerodev.app/api/v2/paymaster/${PROJECT_ID}`;

export function ZeroDevWrapper({ children }: { children: React.ReactNode }) {
  const [smartAccountClient, setSmartAccountClient] = useState<any>(null);
  const [smartAddress, setSmartAddress] = useState<string | undefined>();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // --- Wagmi reactive hooks ---
  const { data: walletClient, status: walletClientStatus } = useWalletClient();
  const { address: eoaAddress, isConnected: eoaIsConnected } = useAccount();
  const { disconnect: wagmiDisconnect } = useDisconnect();

  // Guard against duplicate connect attempts
  const connectingRef = useRef(false);

  // Derived state: smart account is connected only when client is set
  const isSmartConnected = !!smartAccountClient && !!smartAddress;

  // --- Core ZeroDev connect logic (only called when walletClient is resolved) ---
  const connectZeroDev = useCallback(async (client: NonNullable<typeof walletClient>) => {
    if (connectingRef.current) return;
    connectingRef.current = true;
    setIsConnecting(true);
    setError(null);

    try {
      // 1. Validate the wallet client has addresses
      if (!client) {
        throw new Error("Wallet client is undefined — cannot create signer.");
      }

      const addresses = await client.getAddresses();
      if (!addresses || addresses.length === 0) {
        throw new Error("Wallet connected but no address found. Please unlock your wallet.");
      }

      const userAddress = addresses[0];
      if (!userAddress) {
        throw new Error("Signer resolution failed — no address at index 0.");
      }

      console.log("[ShinobiPass] EOA address resolved:", userAddress);

      const publicClient = createPublicClient({
        chain: arcTestnet as any,
        transport: http(process.env.NEXT_PUBLIC_ARC_RPC || "https://rpc.blockdaemon.testnet.arc.network"),
      });

      // 2. Create ECDSA Validator with explicit signer verification
      const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
        signer: {
          address: userAddress,
          signMessage: async ({ message }: any) => {
            if (!userAddress) throw new Error("Signer address lost");
            return client.signMessage({
              message,
              account: userAddress,
            });
          },
          signTypedData: async (data: any) => {
            if (!userAddress) throw new Error("Signer address lost");
            return client.signTypedData({
              ...data,
              account: userAddress,
            } as any);
          }
        } as any,
        entryPoint: ENTRYPOINT_ADDRESS_V07,
        kernelVersion: KERNEL_V3_1,
      } as any);

      // 3. Create Kernel Account with explicit version and validator attached to 'sudo'
      const account = await createKernelAccount(publicClient, {
        plugins: {
          sudo: ecdsaValidator,
        },
        entryPoint: ENTRYPOINT_ADDRESS_V07,
        kernelVersion: KERNEL_V3_1,
      } as any);

      if (!account || !account.address) {
        throw new Error("Failed to initialize Kernel account properties.");
      }

      // 4. Initialize Kernel Account Client
      const accountClient = createKernelAccountClient({
        account,
        chain: arcTestnet as any,
        bundlerTransport: http(bundlerUrl),
        paymaster: createZeroDevPaymasterClient({
          chain: arcTestnet as any,
          transport: http(paymasterUrl),
          entryPoint: ENTRYPOINT_ADDRESS_V07,
        } as any),
      } as any);

      if (!accountClient) {
        throw new Error("Failed to initialize Kernel account client.");
      }

      setSmartAccountClient(accountClient);
      setSmartAddress(account.address);

      console.log("[ShinobiPass] Smart account connected:", account.address);
      console.log("[ShinobiPass] EOA:", userAddress, "| Smart Account:", account.address);

      toast({
        title: "Auth Successful",
        description: "Connected to your ShinobiPass smart account.",
      });
    } catch (e: any) {
      console.error("[ShinobiPass] Failed to connect ZeroDev wallet:", e);
      console.error("[ShinobiPass] EOA:", eoaAddress, "| Error:", e.message);

      // Clean up smart account state on failure
      setSmartAccountClient(null);
      setSmartAddress(undefined);
      setError(e.message || "An unexpected error occurred during authentication.");

      toast({
        variant: "destructive",
        title: "Connection Failed",
        description: e.message || "An unexpected error occurred during authentication.",
      });
    } finally {
      setIsConnecting(false);
      connectingRef.current = false;
    }
  }, [eoaAddress, toast]);

  // --- useEffect: Watch for EOA connection and auto-trigger ZeroDev ---
  useEffect(() => {
    // Only trigger when:
    // 1. EOA is connected (wagmi)
    // 2. walletClient is fully resolved (not pending)
    // 3. Smart account is not already set up
    // 4. Not already in the process of connecting
    if (
      eoaIsConnected &&
      walletClient &&
      walletClientStatus === "success" &&
      !isSmartConnected &&
      !connectingRef.current
    ) {
      console.log("[ShinobiPass] EOA connected, walletClient resolved — initiating ZeroDev setup...");
      connectZeroDev(walletClient);
    }
  }, [eoaIsConnected, walletClient, walletClientStatus, isSmartConnected, connectZeroDev]);

  // --- Log state changes for debugging ---
  useEffect(() => {
    console.log("[ShinobiPass] State change — EOA:", eoaAddress, "| Smart:", smartAddress, "| Connected:", isSmartConnected, "| Connecting:", isConnecting, "| Error:", error);
  }, [eoaAddress, smartAddress, isSmartConnected, isConnecting, error]);

  // --- The `connect` function exposed to consumers just ensures wagmi/EOA triggers ---
  // The actual ZeroDev flow is handled by the useEffect above.
  const connect = useCallback(async () => {
    // If already connected or connecting, no-op
    if (isSmartConnected || connectingRef.current) return;

    // If walletClient is already available, trigger ZeroDev directly
    if (walletClient && eoaIsConnected) {
      await connectZeroDev(walletClient);
      return;
    }

    // Otherwise, the EOA modal should have been opened by the UI (Navbar).
    // The useEffect will pick up the connection once walletClient resolves.
    console.log("[ShinobiPass] Waiting for EOA wallet to connect...");
  }, [isSmartConnected, walletClient, eoaIsConnected, connectZeroDev]);

  const disconnect = useCallback(() => {
    setSmartAccountClient(null);
    setSmartAddress(undefined);
    setIsConnecting(false);
    setError(null);
    connectingRef.current = false;

    // Also disconnect the EOA via wagmi
    wagmiDisconnect();

    console.log("[ShinobiPass] Disconnected — all state cleared.");
  }, [wagmiDisconnect]);

  const sendUserOp = async (calls: { to: string; value?: bigint; data: string }[]) => {
    if (!smartAccountClient || !smartAccountClient.account) {
      throw new Error("Smart account not initialized. Please reconnect.");
    }
    
    const userOpHash = await smartAccountClient.sendUserOperation({
      userOperation: {
        callData: await smartAccountClient.account.encodeCallData(calls.map(c => ({
          to: c.to,
          value: c.value || BigInt(0),
          data: c.data,
        }))),
      },
    });
    return userOpHash;
  };

  const waitForUserOp = async (userOpHash: string) => {
    if (!smartAccountClient) {
      throw new Error("Smart account client not found.");
    }
    return smartAccountClient.waitForUserOperationReceipt({
      hash: userOpHash as `0x${string}`,
    });
  };

  return (
    <SmartWalletContext.Provider value={{
      smartAccount: smartAccountClient,
      isConnected: isSmartConnected,
      isConnecting,
      error,
      address: smartAddress,
      eoaAddress: eoaAddress as string | undefined,
      connect,
      disconnect,
      sendUserOp,
      waitForUserOp,
    }}>
      {children}
    </SmartWalletContext.Provider>
  );
}

export function useSmartWallet() {
  return useContext(SmartWalletContext);
}
