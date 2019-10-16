const debug = require('debug')('southpaw:koamongoose');
const mongoose = require('mongoose');

const defaultMongoOptions = {
  useNewUrlParser: true,
  useCreateIndex: true,
  useUnifiedTopology: true,
  reconnectTries: Number.MAX_SAFE_INTEGER, // Never stop trying to reconnect
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
    useDefaultErrorHandler = true,
  } = options;

  const mongoUrl =
    uri ||
    url ||
    (user && pass && authSource
      ? `mongodb://${user}:${pass}@${host}:${port}/${db}?authSource=${authSource}`
      : `mongodb://${host}:${port}/${db}`);
  const mongoOpts = { ...defaultMongoOptions, ...mongoOptions };
  const models = {};

  debug('Create middleware');
  const connection = mongoose.createConnection();

  // Load each schema by it's key
  Object.keys(schemas).forEach(schemaName => {
    models[schemaName] = connection.model(schemaName, schemas[schemaName](mongoose));
  });

  // Load each event by it's key
  Object.keys(events).forEach(event => connection.on(event, events[event]));

  // Enable the default error handler
  if (useDefaultErrorHandler) {
    connection.on('error', err => {
      connection.close();
      debug(`An error occured with the Mongoose connection.`);
      throw new Error(err);
    });
  }

  connection.openUri(mongoUrl, mongoOpts);

  const getModel = modelName => {
    if (!models.hasOwnProperty(modelName)) {
      throw new Error(`Model name '${modelName}' not found in '${db}'`);
    }

    return models[modelName];
  };

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
