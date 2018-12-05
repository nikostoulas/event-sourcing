select * from events where aggregate_id=$aggregate_id order by version;
select * from aggregates where aggregate_id=$aggregate_id;


insert into aggregates (id, type,version) values ($id,$type,$version) EXCEPTION WHEN unique_violation THEN END;
insert into events  (id,aggregate_id,event_name,version,data) values ($id,$aggregate_id,$event_name,$version,$data);
update aggregates set version=$version where aggregate_id=$aggregate_id and version=$old_version returning id;


insert into consumers  (id,name,version) values ($id,$name,$version);
select * from consumers where aggregate_id=$aggregate_id for update;
select * from events inner join consumers on (events.aggregate_id = consumers.aggregate_id AND consumers.name=$name) where aggregate_id=$aggregate_id and events.version > consumers.version;
update consumers set version=$version where aggregate_id=$aggregate_id (?and version=$min_version-1) and name=$name returning id;


select seq from consumer_seqs where name = $name for UPDATE;
select events.aggregate_id, events.id from events where id > $seq and event_name in ($event_name) limit 100 order by events.id;
pulbish aggregate_ids;
update consumer_seqs set seq = max_seq where name = $name;


get next seq

do the view