create table if not exists events (
  id bigserial NOT NULL,
  aggregate_id character varying(40) NOT NULL,
  event_name character varying(20) NOT NULL,
  version int NOT NULL,
  data jsonb NOT NULL,
  created_at timestamp without time zone NOT NULL  DEFAULT now(),
  CONSTRAINT idx_events_id PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_events
  ON events
  USING btree
  (aggregate_id, version );

ALTER TABLE events add UNIQUE CONSTRAINT using index idx_unique_events 
  DEFERRABLE INITIALLY DEFERRED;

CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS '
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
' LANGUAGE 'plpgsql';

create table if not exists aggregates (
    id character varying(40) NOT NULL,
    type character varying(20) NOT NULL,
    version int NOT NULL,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT idx_aggregates_id PRIMARY KEY (id)
);

DROP TRIGGER IF EXISTS trg_updated_at_aggregates ON aggregates;
CREATE TRIGGER trg_updated_at_aggregates BEFORE UPDATE
  ON aggregates FOR EACH ROW EXECUTE PROCEDURE
  update_updated_at_column();


create table if not exists consumer_aggregates (
  aggregate_id character varying(40) NOT NULL,
  name character varying(20) NOT NULL,
  version int NOT NULL,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT idx_consumers_id PRIMARY KEY (aggregate_id, name)
);

DROP TRIGGER IF EXISTS trg_updated_at_consumer_aggregates ON consumers;
CREATE TRIGGER trg_updated_at_consumer_aggregates BEFORE UPDATE
  ON consumer_aggregates FOR EACH ROW EXECUTE PROCEDURE
  update_updated_at_column();

create table if not exists consumers (
  name character varying(20) NOT NULL,
  seq_id bigint not NULL,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT idx_consumers_name PRIMARY KEY (name)
);

DROP TRIGGER IF EXISTS trg_updated_at_consumers ON consumers_seqs;
CREATE TRIGGER trg_updated_at_consumers BEFORE UPDATE
  ON consumers FOR EACH ROW EXECUTE PROCEDURE
  update_updated_at_column();
