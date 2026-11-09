-- Remove the invented outbox: external events are Openfront Commerce webhooks only.
DROP TABLE IF EXISTS "OutboxEvent";
