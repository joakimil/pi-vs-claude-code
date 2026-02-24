-- ============================================
-- SEED DATA FOR RIDEGO PASSENGER APP
-- Oslo, Norway based
-- ============================================

-- Ride Types
insert into public.ride_types (id, name, description, icon, max_passengers, base_fare_nok, per_km_nok, per_min_nok, min_fare_nok, vehicle_type, sort_order) values
  ('a1111111-1111-1111-1111-111111111111', 'Economy', 'Affordable everyday rides', '🚗', 3, 39.00, 12.00, 3.00, 49.00, 'sedan', 1),
  ('a2222222-2222-2222-2222-222222222222', 'Comfort', 'Newer cars, top-rated drivers', '🚘', 3, 59.00, 16.00, 4.50, 79.00, 'sedan', 2),
  ('a3333333-3333-3333-3333-333333333333', 'XL', 'SUVs and vans for groups', '🚐', 6, 79.00, 20.00, 5.50, 99.00, 'suv', 3);

-- Drivers (5 sample drivers around Oslo)
insert into public.drivers (id, display_name, phone, rating_avg, total_trips, is_active, is_online) values
  ('d1111111-1111-1111-1111-111111111111', 'Mohamed K.', '+4791234567', 4.92, 847, true, true),
  ('d2222222-2222-2222-2222-222222222222', 'Anna S.', '+4792345678', 4.88, 1203, true, true),
  ('d3333333-3333-3333-3333-333333333333', 'Erik B.', '+4793456789', 4.75, 562, true, true),
  ('d4444444-4444-4444-4444-444444444444', 'Fatima H.', '+4794567890', 4.95, 2104, true, true),
  ('d5555555-5555-5555-5555-555555555555', 'Lars O.', '+4795678901', 4.60, 328, true, false);

-- Vehicles (available_seats = actual passenger seats in each car)
insert into public.vehicles (id, driver_id, make, model, year, color, license_plate, vehicle_type, is_active, available_seats) values
  ('v1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', 'Toyota', 'Camry', 2022, 'White', 'EL 12345', 'sedan', true, 4),
  ('v2222222-2222-2222-2222-222222222222', 'd2222222-2222-2222-2222-222222222222', 'Tesla', 'Model 3', 2023, 'Black', 'EK 67890', 'sedan', true, 4),
  ('v3333333-3333-3333-3333-333333333333', 'd3333333-3333-3333-3333-333333333333', 'Volkswagen', 'ID.4', 2023, 'Silver', 'EV 11223', 'suv', true, 4),
  ('v4444444-4444-4444-4444-444444444444', 'd4444444-4444-4444-4444-444444444444', 'Mercedes-Benz', 'E-Class', 2022, 'Dark Blue', 'EB 44556', 'sedan', true, 6),
  ('v5555555-5555-5555-5555-555555555555', 'd5555555-5555-5555-5555-555555555555', 'Volkswagen', 'Multivan', 2021, 'Gray', 'DN 78901', 'van', true, 7);

-- Driver Locations (positioned around central Oslo)
-- Mohamed: near Nydalen (59.9494, 10.7655)
-- Anna: near Majorstuen (59.9298, 10.7130)
-- Erik: near Grünerløkka (59.9225, 10.7590)
-- Fatima: near Oslo S (59.9111, 10.7528)
-- Lars is offline, but position near Frogner
insert into public.driver_locations (driver_id, location, heading, speed_kmh, updated_at) values
  ('d1111111-1111-1111-1111-111111111111', ST_SetSRID(ST_MakePoint(10.7655, 59.9494), 4326)::geography, 180.0, 0, now()),
  ('d2222222-2222-2222-2222-222222222222', ST_SetSRID(ST_MakePoint(10.7130, 59.9298), 4326)::geography, 90.0, 25.5, now()),
  ('d3333333-3333-3333-3333-333333333333', ST_SetSRID(ST_MakePoint(10.7590, 59.9225), 4326)::geography, 270.0, 0, now()),
  ('d4444444-4444-4444-4444-444444444444', ST_SetSRID(ST_MakePoint(10.7528, 59.9111), 4326)::geography, 0.0, 15.0, now()),
  ('d5555555-5555-5555-5555-555555555555', ST_SetSRID(ST_MakePoint(10.7010, 59.9215), 4326)::geography, 45.0, 0, now());

-- Promo Codes
insert into public.promo_codes (id, code, promo_type, value, max_discount_nok, min_fare_nok, max_uses, valid_until, is_active) values
  ('p1111111-1111-1111-1111-111111111111', 'WELCOME50', 'percentage', 50.00, 100.00, 49.00, null, now() + interval '90 days', true),
  ('p2222222-2222-2222-2222-222222222222', 'OSLO2025', 'fixed', 30.00, null, 79.00, 1000, now() + interval '30 days', true),
  ('p3333333-3333-3333-3333-333333333333', 'FREERIDE', 'percentage', 100.00, 150.00, 0, 100, now() + interval '7 days', true);
