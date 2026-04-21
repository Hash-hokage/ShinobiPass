"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { createPublicClient, http, custom } from "viem";
import { createKernelAccountClient, createZeroDevPaymasterClient } from "@zerodev/sdk";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import { arcTestnet } from "@/lib/contract";

// ERC-4337 EntryPoint v0.7 address (well-known constant, removed from permissionless v0.2.x)
const ENTRYPOINT_ADDRESS_V07 = "0x0000000071727De22E5E9d8BAf0edAc6f37da032" as const;

type SmartWalletContextType = {
  smartAccount: any;
  isConnected: boolean;
  address: string | undefined;
  connect: (email?: string) => Promise<void>;
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
  const [address, setAddress] = useState<string | undefined>();
  const [isConnected, setIsConnected] = useState(false);

  const connect = async (email?: string) => {
    try {
      // Connect to injected wallet as the ECDSA signer owner
      if (!window.ethereum) throw new Error("No injected wallet found");
      const provider = window.ethereum;
      await provider.request({ method: "eth_requestAccounts" });

      const publicClient = createPublicClient({
        chain: arcTestnet as any,
        transport: http(process.env.NEXT_PUBLIC_ARC_RPC || "https://rpc.arc.testnet.circle.com"),
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
        signer: {
          address: await provider.request({ method: "eth_requestAccounts" }).then((res: any) => res[0]),
          signMessage: async ({ message }: any) => {
            return provider.request({
              method: "personal_sign",
              params: [message, await provider.request({ method: "eth_requestAccounts" }).then((res: any) => res[0])],
            });
          },
          signTypedData: async (data: any) => {
            return provider.request({
              method: "eth_signTypedData_v4",
              params: [await provider.request({ method: "eth_requestAccounts" }).then((res: any) => res[0]), JSON.stringify(data)],
            });
          }
        } as any,
        entryPoint: ENTRYPOINT_ADDRESS_V07,
      } as any);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accountClient = createKernelAccountClient({
        account: ecdsaValidator as any,
        chain: arcTestnet as any,
        bundlerTransport: http(bundlerUrl),
        paymaster: createZeroDevPaymasterClient({
          chain: arcTestnet as any,
          transport: http(paymasterUrl),
          entryPoint: ENTRYPOINT_ADDRESS_V07,
        } as any),
      } as any);

      setSmartAccountClient(accountClient);
      setAddress((accountClient as any).account?.address);
      setIsConnected(true);
    } catch (e) {
      console.error("Failed to connect ZeroDev wallet:", e);
    }
  };

  const disconnect = () => {
    setSmartAccountClient(null);
    setAddress(undefined);
    setIsConnected(false);
  };

  const sendUserOp = async (calls: { to: string; value?: bigint; data: string }[]) => {
    if (!smartAccountClient) throw new Error("Not connected");
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
    if (!smartAccountClient) throw new Error("Not connected");
    return smartAccountClient.waitForUserOperationReceipt({
      hash: userOpHash as `0x${string}`,
    });
  };

  return (
    <SmartWalletContext.Provider value={{ smartAccount: smartAccountClient, isConnected, address, connect, disconnect, sendUserOp, waitForUserOp }}>
      {children}
    </SmartWalletContext.Provider>
  );
}

export function useSmartWallet() {
  return useContext(SmartWalletContext);
}
