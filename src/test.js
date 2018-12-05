const giftCard = require('./cmd/giftCard');
(async () => {
  const date = new Date();
  for (let i = 0; i < 5000; i++) {
    const id = await giftCard.create({ amount: 500 });
    await giftCard.redeem({ id, amount: 30 });
    await giftCard.redeem({ id, amount: 30 });
    await giftCard.redeem({ id, amount: 30 });
  }
  console.log('took', new Date().getTime() - date.getTime(), 'ms');
})();
