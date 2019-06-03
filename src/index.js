const debug = require('debug')('koa:mongo');
const mongoose = require('mongoose');
const muri = require('muri');

const defaultMongoOptions = {
  useNewUrlParser: true,
  useCreateIndex: true,
  reconnectTries: Number.MAX_VALUE, // Never stop trying to reconnect
  reconnectInterval: 500, // Reconnect every 500ms
  poolSize: 10, // Maintain up to 10 socket connections
  bufferMaxEntries: 0, // If not connected, return errors immediately rather than waiting for reconnect
  connectTimeoutMS: 10000, // Give up initial connection after 10 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
};

const middleware = (options = {}) => {
  const {
    uri = null,
    url = null,
    host = 'localhost',
    port = 27017,
    user = null,
    pass = null,
    db = 'default',
    authSource = 'admin',
    mongoOptions = defaultMongoOptions,
    schemas = {},
    events = {},
  } = options;

  let dbName = db;
  let mongoUrl = uri || url;
  let mongoOpts = { ...defaultMongoOptions, ...mongoOptions };

  const models = {};

  if (!mongoUrl) {
    if (user && pass && authSource) {
      mongoUrl = `mongodb://${user}:${pass}@${host}:${port}/${db}?authSource=${authSource}`;
    } else {
      mongoUrl = `mongodb://${host}:${port}/${db}`;
    }
  } else {
    const o = muri(mongoUrl);
    dbName = o.db;
  }

  debug('Create middleware');

  const conn = mongoose.createConnection();

  conn.on('error', err => {
    conn.close();
    debug(`An error occured with the Mongoose connection.`);
    throw new Error(err);
  });

  if (schemas) {
    // Load each schema by it's key
    Object.keys(schemas).forEach(key => {
      models[key] = conn.model(key, schemas[key](mongoose));
    });
  }

  if (events) {
    // Load each event by it's key
    Object.keys(events).forEach(key => conn.on(key, events[key]));
  }

  conn.openUri(mongoUrl, mongoOpts);

  function getModel(modelName) {
    if (!models.hasOwnProperty(modelName)) {
      throw new Error(`Model '${modelName}' not found in '${dbName}'`);
    }

    return models[modelName];
  }

  return async (ctx, next) => {
    ctx.model = modelName => {
      try {
        return getModel(modelName);
      } catch (err) {
        ctx.throw(500, err);
      }
    };

    ctx.document = (modelName, document) => new (getModel(modelName))(document);

    await next();
  };
};

module.exports = middleware;
