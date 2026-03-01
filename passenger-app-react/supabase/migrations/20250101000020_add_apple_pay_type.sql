-- Add apple_pay to payment_type enum
alter type public.payment_type add value if not exists 'apple_pay';
