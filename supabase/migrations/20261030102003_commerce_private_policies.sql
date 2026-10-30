-- Explicit service-only policies document the intended private-schema access.
create policy inventory_service_only on vivi_private.order_inventory for all to service_role using(true) with check(true);
create policy rate_limits_service_only on vivi_private.rate_limits for all to service_role using(true) with check(true);
