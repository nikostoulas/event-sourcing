const { createProvider, migrate } = require('evtstore/provider/pg');

const { Pool } = require('pg');

const client = new Pool({ connectionString: 'postgresql://postgres@localhost:5432/event_sourcing' });

const provider = createProvider({
  client,
  limit: 1000, // The maximum number of events that can be returned at a time
  events: 'evt_events',
  bookmarks: 'evt_bookmarks',
});

async function setupEventStore() {
  await migrate({ client, events: 'evt_events', bookmarks: 'evt_bookmarks' });
}

module.exports = {
  provider,
  setupEventStore,
};
