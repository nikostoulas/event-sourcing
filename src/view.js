const { runInTransaction } = require('./client');

async function process(aggregateId, consumerName, eventNames, viewHandler) {
  await runInTransaction(async client => {
    let consumerAggregate = await client.query(
      'select * from consumer_aggregates where aggregate_id=$1 and name=$2 for update NOWAIT',
      [aggregateId, consumerName]
    );
    let version = -1;
    if (consumerAggregate.rows.length === 0) {
      await client.query('insert into consumer_aggregates (aggregate_id,name,version) values ($1, $2, $3)', [
        aggregateId,
        consumerName,
        version
      ]);
      consumerAggregate = await client.query(
        'select * from consumer_aggregates where aggregate_id=$1 and name=$2 for update NOWAIT',
        [aggregateId, consumerName]
      );
    }
    version = consumerAggregate.rows[0].version;

    const events = await client.query(
      'select * from events where aggregate_id=$1 and version > $2 and event_name = ANY ($3) order by events.id',
      [aggregateId, version, eventNames]
    );
    if (events.rows.length === 0) {
      return;
    }
    await viewHandler(aggregateId, events.rows);
    // if (Math.random() > 0.999) throw new Error('testing');
    const lastVersion = events.rows.pop().version;
    await client.query('update consumer_aggregates set version=$1 where aggregate_id=$2 and name=$3', [
      lastVersion,
      aggregateId,
      consumerName
    ]);
    // console.log(`Updated ${consumerName} for aggregate ${aggregateId} into version ${lastVersion}`);
  });
}

async function create(consumerName, eventNames, viewHandler) {
  let timeout = 5000;
  const batchSize = 10000;
  await runInTransaction(async client => {
    const consumer = await client.query('select * from consumers where name=$1', [consumerName]);
    let seq = -1n;
    if (consumer.rows.length === 0) {
      await client.query('insert into consumers(name, seq_id) values ($1, $2)', [consumerName, -1]);
    } else {
      seq = BigInt(consumer.rows[0].seq_id);
    }
    console.log(`${consumerName} up to ${seq}`);
    // console.log('Got last version processed', seq);
    const events = await client.query(
      `select events.aggregate_id, events.id
from events 
left join consumer_aggregates on events.aggregate_id=consumer_aggregates.aggregate_id AND consumer_aggregates.name=$1
where events.id between $2 and $3 and event_name = ANY ($4)  
    and (consumer_aggregates.version is null or events.version > consumer_aggregates.version)
order by events.id limit $5`,
      [consumerName, seq, seq + BigInt(batchSize), eventNames, batchSize]
    );
    if (events.rows.length > 0) {
      const eventIdConsumedPreviously = events.rows[0].id - 1;
      await client.query('update consumers set seq_id=$1 where name=$2', [eventIdConsumedPreviously, consumerName]);
    } else {
      const { rows: [{ max_id = 0 } = {}] = [] } = await client.query('select max(events.id) as max_id from events');
      await client.query('update consumers set seq_id=$1 where name=$2', [
        seq + BigInt(batchSize) < BigInt(max_id) ? seq + BigInt(batchSize) : BigInt(max_id),
        consumerName
      ]);
      if (seq !== BigInt(max_id)) {
        timeout = 10;
      }
    }
    if (events.rows.length > 0) {
      timeout = 10;
    }

    for (const aggregate_id of Object.keys(events.rows.reduce((agg, v) => (agg[v.aggregate_id] = true && agg), {}))) {
      //   console.log('Will process aggregate: ', aggregate_id);
      process(aggregate_id, consumerName, eventNames, viewHandler).catch(e => console.log(e));
    }
  });

  setTimeout(() => create(consumerName, eventNames, viewHandler), timeout);
}

module.exports.create = create;
