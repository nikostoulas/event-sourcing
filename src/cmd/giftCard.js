const uuid = require('uuid');
const aggregate = require('../aggregate');
class GiftCard {
  constructor(id) {
    this.id = id;
  }

  static create(event) {
    if (event.amount < 0) {
      throw new Error('amount < 0');
    }
    const id = event.id || uuid.v4();
    return aggregate.run(
      id,
      'giftCard',
      aggregate.handler(GiftCard, card => [{ name: 'created', aggregate_id: card.id, data: event }])
    );
  }

  static redeem(event) {
    if (event.amount < 0) {
      throw new Error('amount < 0');
    }
    return aggregate.run(
      event.id,
      'giftCard',
      aggregate.handler(GiftCard, card => {
        if (event.amount > card.remainingAmount) {
          throw new Error('amount > remainingamount');
        }
        return [{ name: 'redeemed', aggregate_id: card.id, data: { amount: event.amount } }];
      })
    );
  }

  created(event) {
    this.remainingAmount = event.data.amount;
  }

  redeemed(event) {
    this.remainingAmount -= event.data.amount;
  }
}

module.exports = GiftCard;
