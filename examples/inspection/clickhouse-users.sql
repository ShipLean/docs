-- Run once as a ClickHouse admin, after the collector has started and created the otel tables.
-- Two users: the collector writes telemetry, ShipLean reads it. Checked with ClickHouse 26.3: the reader cannot write to `otel`,
-- and the collector's inserts still fill ShipLean's materialized views in `inspection` without any grant on it.

-- 1. The collector's user is the one the ClickHouse container is created with (CLICKHOUSE_USER in the compose file), or any
--    user that can CREATE TABLE and INSERT on `otel`. ShipLean never uses it. In production give it only:
--      GRANT CREATE DATABASE, CREATE TABLE, INSERT, SELECT, ALTER ON otel.* TO <collector user>;

-- 2. ShipLean's user: read-only on the telemetry.
CREATE USER IF NOT EXISTS shiplean_reader IDENTIFIED BY 'change-me-reader';
GRANT SELECT ON otel.otel_traces TO shiplean_reader;
GRANT SELECT ON otel.otel_logs TO shiplean_reader;
-- ShipLean keeps its own small run index in a separate `inspection` database (it never writes to `otel`).
GRANT CREATE DATABASE, CREATE TABLE, CREATE VIEW, INSERT, SELECT, ALTER, DROP TABLE, DROP VIEW ON inspection.* TO shiplean_reader;
