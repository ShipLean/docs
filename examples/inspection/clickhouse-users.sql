-- Run once as a ClickHouse admin, after the collector has started and created the otel tables.
-- Two users: the collector writes telemetry, ShipLean reads it. Checked with ClickHouse 26.3: the reader cannot write to `otel`,
-- and the collector's inserts still fill ShipLean's materialized views in `inspection` without any grant on it.

-- 1. The collector's user is the one the ClickHouse container is created with (CLICKHOUSE_USER in the compose file), or any
--    user that can CREATE TABLE and INSERT on `otel`. ShipLean never uses it. In production give it only:
--      GRANT CREATE DATABASE, CREATE TABLE, INSERT, SELECT, ALTER ON otel.* TO <collector user>;

-- 2. ShipLean's user: read-only on the telemetry.
-- __READER_PASSWORD__ is replaced from the container's SHIPLEAN_READER_PASSWORD when the file is piped in (see the docs page), so no
-- password is stored in this file or typed on a command line. HOST limits where the reader may connect from: loopback and the
-- private ranges (Docker's bridge, a LAN). Narrow it to ShipLean's own address in production.
CREATE USER IF NOT EXISTS shiplean_reader IDENTIFIED BY '__READER_PASSWORD__'
    HOST IP '127.0.0.0/8', '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16';
GRANT SELECT ON otel.otel_traces TO shiplean_reader;
GRANT SELECT ON otel.otel_logs TO shiplean_reader;
-- ShipLean keeps its own small run index in a separate `inspection` database (it never writes to `otel`).
GRANT CREATE DATABASE, CREATE TABLE, CREATE VIEW, INSERT, SELECT, ALTER, DROP TABLE, DROP VIEW ON inspection.* TO shiplean_reader;
