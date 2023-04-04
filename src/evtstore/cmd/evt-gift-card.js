const { createAggregate, createCommands } = require('evtstore');
const { createDomainV2 } = require('evtstore/src/domain-v2');

const { provider } = require('../evt-client');
const giftcard = createAggregate({
  stream: 'giftcard-events',
  create: () => ({ remainingAmount: 0 }),
  fold: (evt, agg) => {
    switch (evt.type) {
      case 'created':
        return { remainingAmount: evt.amount };
      case 'redeemed':
        console.log(evt, agg);
        return { remainingAmount: agg.remainingAmount - evt.amount };
    }
  },
});

const { domain, createHandler } = createDomainV2({ provider }, { giftcard });
const giftcardInstances = createHandler('giftcards', ['giftcard-events'], {
  alwaysTailStream: false,
  continueOnError: false,
  tailStream: false,
});

giftcardInstances.handle('giftcard-events', 'created', async (id, ev, meta) => {
  // Create a profile in your database
  console.log(`received ${id}, ${JSON.stringify(ev)}, ${JSON.stringify(meta)}`);
});

giftcardInstances.handle('giftcard-events', 'redeemed', async (id, ev, meta) => {
  // Create a profile in your database
  console.log(`received redeemed ${id}, ${JSON.stringify(ev)}, ${JSON.stringify(meta)}`);
});

giftcardInstances.start();

const command = createCommands(domain.giftcard, {
  create: async (cmd, agg) => {
    if (agg.version > 0) throw new Error('Giftcard already exists');
    return { type: 'created', amount: cmd.amount };
  },

  redeem: async (cmd, agg) => {
    console.log(cmd, agg);
    if (agg.remainingAmount <= cmd.amount) throw new Error('Not enough money');
    return { type: 'redeemed', amount: cmd.amount };
  },
});

module.exports = {
  command,
};
