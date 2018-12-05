const view = require('../view');
const { runInTransaction } = require('../client1');
view.create('giftCard4', ['created', 'redeemed'], async (aggregateId, events) => {
  await runInTransaction(async client => {
    console.log('viewing');
    for (const event of events) {
      switch (event.event_name) {
        case 'created':
          await client.query('insert into gift_cards (id,remainingAmount,version) values ($1, $2, $3)', [
            event.aggregate_id,
            event.data.amount,
            event.version
          ]);
          break;
        case 'redeemed':
          await client.query(
            'update gift_cards set remainingAmount = remainingAmount - $1 , version=$2 where id=$3 and version < $2',
            [event.data.amount, event.version, event.aggregate_id]
          );
          break;
      }
    }
  });
});
