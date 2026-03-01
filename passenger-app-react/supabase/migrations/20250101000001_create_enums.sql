create type public.ride_status as enum (
  'requested',
  'matching',
  'driver_assigned',
  'arriving',
  'in_progress',
  'completed',
  'cancelled_by_passenger',
  'cancelled_by_driver',
  'cancelled_by_system',
  'no_drivers'
);

create type public.vehicle_type as enum (
  'sedan',
  'suv',
  'van',
  'luxury'
);

create type public.payment_type as enum (
  'card',
  'vipps',
  'corporate',
  'cash'
);

create type public.promo_type as enum (
  'percentage',
  'fixed'
);
