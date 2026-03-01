import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';

export interface Place {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export interface RideType {
  id: string;
  name: string;
  icon: string;
  description: string;
  base_fare_nok: number;
  per_km_nok: number;
  per_min_nok: number;
  min_fare_nok: number;
  eta_min: number;
  sort_order: number;
  is_active: boolean;
}

export interface PaymentMethod {
  id: string;
  user_id: string;
  payment_type: 'card' | 'apple_pay' | 'vipps' | 'corporate' | 'cash';
  label: string;
  is_default: boolean;
  card_brand?: string;
  card_last4?: string;
}

export const CASH_PAYMENT: PaymentMethod = {
  id: '_cash',
  user_id: '',
  payment_type: 'cash',
  label: 'Cash',
  is_default: false,
};

interface AppState {
  // Auth
  user: User | null;
  setUser: (user: User | null) => void;

  // Location
  userLocation: { lat: number; lng: number } | null;
  setUserLocation: (loc: { lat: number; lng: number } | null) => void;
  locationPermission: 'granted' | 'denied' | 'unknown';
  setLocationPermission: (p: 'granted' | 'denied' | 'unknown') => void;

  // Pickup (defaults to Nydalen)
  pickup: Place;
  setPickup: (p: Place) => void;

  // Destination
  destination: Place | null;
  setDestination: (d: Place | null) => void;

  // Ride types from DB
  rideTypes: RideType[];
  setRideTypes: (rt: RideType[]) => void;

  // Selected ride type
  selectedRideType: RideType | null;
  setSelectedRideType: (rt: RideType | null) => void;

  // Current ride id
  currentRideId: string | null;
  setCurrentRideId: (id: string | null) => void;

  // Payment methods
  paymentMethods: PaymentMethod[];
  setPaymentMethods: (pm: PaymentMethod[]) => void;
  selectedPaymentMethod: PaymentMethod;
  setSelectedPaymentMethod: (pm: PaymentMethod) => void;

  // Seats
  seats: number;
  setSeats: (n: number) => void;

  // Toast
  toasts: { id: number; message: string; type: 'success' | 'error' | 'info' }[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

let toastId = 0;

export const useStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),

  userLocation: null,
  setUserLocation: (userLocation) => set({ userLocation }),
  locationPermission: (localStorage.getItem('ridego_location_perm') as any) || 'unknown',
  setLocationPermission: (p) => {
    localStorage.setItem('ridego_location_perm', p);
    set({ locationPermission: p });
  },

  pickup: { name: 'Nydalen T-banestasjon', address: 'Nydalen allé 1, Oslo', lat: 59.9494, lng: 10.7655 },
  setPickup: (pickup) => set({ pickup }),

  destination: null,
  setDestination: (destination) => set({ destination }),

  rideTypes: [],
  setRideTypes: (rideTypes) => set({ rideTypes }),

  selectedRideType: null,
  setSelectedRideType: (selectedRideType) => set({ selectedRideType }),

  currentRideId: null,
  setCurrentRideId: (currentRideId) => set({ currentRideId }),

  paymentMethods: [],
  setPaymentMethods: (paymentMethods) => set({ paymentMethods }),
  selectedPaymentMethod: CASH_PAYMENT,
  setSelectedPaymentMethod: (selectedPaymentMethod) => set({ selectedPaymentMethod }),

  seats: 1,
  setSeats: (seats) => set({ seats }),

  toasts: [],
  showToast: (message, type = 'info') => {
    const id = ++toastId;
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3000);
  },
}));
