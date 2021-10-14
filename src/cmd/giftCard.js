const uuid = require('uuid');
const aggregate = require('../aggregate');
class GiftCard {
  constructor(id) {
    this.id = id;
  }

  static async init(id) {
    const giftCard = new GiftCard(id);
    const events = await aggregate.getEvents(id);
    for (const event of events) {
      giftCard[event.event_name](event);
    }
    return giftCard;
  }

  static create(event) {
    if (event.amount < 0) {
      throw new Error('amount < 0');
    }
    const id = event.id || uuid.v4();
    return aggregate.run(
      id,
      'giftCard',
      aggregate.handler(GiftCard, card => {
        if (card.init) throw new Error('Already Created');
        return [{ name: 'created', aggregate_id: card.id, data: event }];
      })
    );
  }

  static redeem(event) {
    if (event.amount < 0 || !event.amount) {
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

  async redeem(event) {
    await GiftCard.redeem({ id: this.id, ...event });
    this.remainingAmount -= event.amount;
    return this;
  }

  static topup(event) {
    if (event.amount < 0 || !event.amount) {
      throw new Error('amount < 0');
    }
    return aggregate.run(
      event.id,
      'giftCard',
      aggregate.handler(GiftCard, card => {
        return [{ name: 'topuped', aggregate_id: card.id, data: { amount: event.amount } }];
      })
    );
  }

  async topup(event) {
    await GiftCard.topup({ id: this.id, ...event });
    this.remainingAmount += event.amount;
    return this;
  }

  created(event) {
    this.init = true;
    this.remainingAmount = event.data.amount;
  }

  redeemed(event) {
    this.remainingAmount -= event.data.amount;
  }

  topuped(event) {
    this.remainingAmount += event.data.amount || 0;
  }
}

module.exports = GiftCard;
