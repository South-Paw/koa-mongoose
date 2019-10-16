# koa-mongoose

🍃 Mongoose middleware for Koa 2

[![npm](https://img.shields.io/npm/v/@south-paw/koa-mongoose.svg)](https://www.npmjs.com/package/@south-paw/koa-mongoose)
[![CI Status](https://img.shields.io/travis/South-Paw/koa-mongoose.svg)](https://travis-ci.org/South-Paw/koa-mongoose)
[![Coveralls Status](https://img.shields.io/coveralls/github/South-Paw/koa-mongoose.svg)](https://coveralls.io/github/South-Paw/koa-mongoose)
[![Dependencies](https://david-dm.org/South-Paw/koa-mongoose/status.svg)](https://david-dm.org/South-Paw/koa-mongoose)
[![Dev Dependencies](https://david-dm.org/South-Paw/koa-mongoose/dev-status.svg)](https://david-dm.org/South-Paw/koa-mongoose?type=dev)

---

## Features

- Adds `model()` and `document()` to the koa `ctx`
- Config for automatically loading schemas and events on the mongoose instance

## Basic Usage

The middleware config accepts a `user` and `pass` or you can use a `uri` or `url` as an escape hatch for other url schemes.

Unauthenticated connections will also work by omitting the `user` and `pass` and only providing a `host`, `port` and `db`.

Note: If you're using the `mongodb+srv` syntax to connect to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas), you [should use the mongoose `dbName` option to specify the database](https://stackoverflow.com/questions/48917591/fail-to-connect-mongoose-to-atlas/48917626#48917626) because you currently cannot in the connection string. ([source](https://mongoosejs.com/docs/connections.html)) Be sure to change the default koa-mongoose `db` option to match as well.

```js
const Koa = require('koa');
const mongoose = require('@south-paw/koa-mongoose');

const app = new Koa();

// middleware config
const config = {
  host: 'localhost',
  port: '27017',
  user: '',
  pass: '',
  db: 'test',
  mongoOptions: {
    // these are the default middleware options, see https://mongoosejs.com/docs/connections.html#options
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
    reconnectTries: Number.MAX_SAFE_INTEGER, // Never stop trying to reconnect
    reconnectInterval: 500, // Reconnect every 500ms
    poolSize: 10, // Maintain up to 10 socket connections
    bufferMaxEntries: 0, // If not connected, return errors immediately rather than waiting for reconnect
    connectTimeoutMS: 10000, // Give up initial connection after 10 seconds
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  },
  schemas: {
    // schemas recieve the middleware's mongoose instance, see https://mongoosejs.com/docs/schematypes.html
    users: ({ Schema }) =>
      new Schema(
        {
          name: { type: String },
          pets: [Schema.Types.ObjectId],
        },
        { collection: 'users' },
      ),
    pets: ({ Schema }) =>
      new Schema(
        {
          type: { type: String },
          name: { type: String },
        },
        { collection: 'pets' },
      ),
  },
  events: {
    // see https://mongoosejs.com/docs/api.html#connection_Connection-readyState
    error: () => console.error('mongoose: error'),
    connected: () => console.log('mongoose: connected'),
    connecting: () => console.log('mongoose: connecting'),
    disconnecting: () => console.log('mongoose: disconnecting'),
    disconnected: () => console.log('mongoose: disconnected'),
  },
  useDefaultErrorHandler: false, // enable or disable the default error handler
};

// apply the middleware
app.use(mongoose(config));

// and you can now use the middleware via the ctx with
// `ctx.model(modelName)` and `ctx.document(modelName, document)`
```

## Issues and Bugs

If you manage to find any, please report them [here](https://github.com/South-Paw/koa-mongoose/issues) so they can be squashed.

## Development and Contributing

Pull the repo and install dependencies with `yarn`

```bash
# format source with prettier
yarn format

# lint source
yarn lint
```

## License

MIT, see the [LICENSE](./LICENSE) file.
