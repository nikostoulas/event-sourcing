const { runInTransaction } = require('./client');

const aggregates = {};
// select * from events where aggregate_id=$aggregate_id order by version;
// select * from aggregates where aggregate_id=$aggregate_id;
module.exports.run = async (aggregateId, type, cmdHandler) => {
  return await runInTransaction(async client => {
    const aggregate = await client.query('select * from aggregates where id=$1', [aggregateId]);
    let version = -1;
    if (aggregate.rows.length === 0) {
      await client.query('insert into aggregates(id, type, version) values ($1, $2, $3)', [aggregateId, type, version]);
    } else {
      version = aggregate.rows[0].version;
    }
    // console.log('Got last aggregate version', version);
    const agVersion = aggregates[aggregateId]?.version || -1;
    const events = await client.query('select * from events where aggregate_id=$1 and version > $2 order by version', [
      aggregateId,
      agVersion
    ]);
    const newEvents = await cmdHandler(aggregateId, events.rows);
    const queries = [];
    let versionIterator = version;
    for (const e of newEvents) {
      versionIterator = versionIterator + 1;
      queries.push(
        client.query('insert into events (aggregate_id,version,event_name,data) values ($1, $2, $3, $4)', [
          aggregateId,
          versionIterator,
          e.name,
          e.data
        ])
      );
    }
    await Promise.all(queries);
    const latestId = await client.query('update aggregates set version=$1 where id=$2 and version=$3 returning id;', [
      versionIterator,
      aggregateId,
      version
    ]);
    if (latestId.rows.length === 0) {
      throw new Error('Conflict');
    }
    // console.log('Committed');
    return aggregateId;
  });
};

module.exports.handler = (Class, cb) => {
  return (id, events) => {
    const instance = aggregates[id] || new Class(id);
    for (const event of events) {
      instance[event.event_name](event);
      instance.version = event.version;
    }
    aggregates[id] = instance;
    return cb(instance);
  };
};

module.exports.getEvents = async id => {
  return await runInTransaction(async client => {
    const events = await client.query('select * from events where aggregate_id=$1 order by version', [id]);
    return events.rows;
  });
};
