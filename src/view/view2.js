const view = require('../view');
const { runInTransaction } = require('../client1');
let created = 0;
let redeemed = 0;
let redeemedIds = [];
view.create('giftCard16', ['created', 'redeemed'], async (aggregateId, events) => {
  //   console.log('viewing');
  for (const event of events) {
    switch (event.event_name) {
      case 'created':
        //   await client.query('insert into gift_cards (id,remainingAmount,version) values ($1, $2, $3)', [
        //     event.aggregate_id,
        //     event.data.amount,
        //     event.version
        //   ]);
        created++;
        break;
      case 'redeemed':
        if (redeemedIds.indexOf(event.id) !== -1) {
          console.log('duplicate event', event);
          break;
        }
        redeemedIds.push(event.id);
        if (redeemedIds.length > 1000) {
          redeemedIds.shift();
        }
        //   await client.query(
        //     'update gift_cards set remainingAmount = remainingAmount - $1 , version=$2 where id=$3 and version < $2',
        //     [event.data.amount, event.version, event.aggregate_id]
        //   );
        redeemed++;
        break;
    }
  }
});

setInterval(() => console.log('created: ', created, ' redeemed: ', redeemed), 30000);
