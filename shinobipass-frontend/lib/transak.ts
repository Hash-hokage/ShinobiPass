// import { Transak } from '@transak/transak-sdk'

// TODO: Replace with real Transak API key when available. 
// Requires business account at dashboard.transak.com

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function openTransakWidget(walletAddress: string) {
  // Mock function if real API key was available:
  /*
  const transak = new Transak({
    apiKey: process.env.NEXT_PUBLIC_TRANSAK_API_KEY || 'YOUR_TRANSAK_STAGING_API_KEY',
    environment: 'STAGING',
    network: 'arc',
    cryptoCurrencyCode: 'USDC',
    walletAddress,
    themeColor: '7c5cfc',
    hideMenu: true,
  })
  transak.init()
  */
  
  // Custom event to trigger our fallback modal instead:
  window.dispatchEvent(new CustomEvent('open-transak-fallback'));
}
