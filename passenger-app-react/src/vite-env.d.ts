/// <reference types="vite/client" />

// Apple Pay JS API
interface ApplePaySession {
  canMakePayments(): boolean;
}

declare const ApplePaySession: {
  new (version: number, request: unknown): ApplePaySession;
  canMakePayments(): boolean;
} | undefined;

interface Window {
  ApplePaySession?: typeof ApplePaySession;
}
