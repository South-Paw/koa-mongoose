const { name } = require('../package.json');

jest.mock('mongoose');

const middleware = require('./index');

const defaultOpts = {
  useNewUrlParser: true,
  useCreateIndex: true,
  useUnifiedTopology: true,
  reconnectTries: Number.MAX_SAFE_INTEGER,
  reconnectInterval: 500,
  poolSize: 10,
  bufferMaxEntries: 0,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
};

const mongooseSetup = () => {
  const modelMocks = {};

  const on = jest.fn();
  const model = jest.fn().mockImplementation((name, mock) => (modelMocks[name] = mock));
  const close = jest.fn();
  const openUri = jest.fn();

  const createConnectionMock = jest.fn().mockImplementation(() => ({ on, model, close, openUri }));
  require('mongoose').__setupCreateConnectionMock(createConnectionMock);

  const Schema = jest.fn();
  Schema.Types = {
    ObjectId: 'ObjectId',
  };

  require('mongoose').Schema = Schema;

  return {
    modelMocks,
    createConnection: createConnectionMock,
    onMock: on,
    modelMock: model,
    closeMock: close,
    openUriMock: openUri,
    SchemaMock: Schema,
  };
};

describe(name, () => {
  beforeEach(() => jest.resetAllMocks());

  it(`should call connect without any config`, () => {
    const { openUriMock } = mongooseSetup();

    middleware();

    const url = 'mongodb://localhost:27017/default';
    const opts = { ...defaultOpts };

    expect(openUriMock).toHaveBeenCalledWith(url, opts);
  });

  it(`should call connect with a given uri`, () => {
    const { openUriMock } = mongooseSetup();

    const uri = 'mongodb+srv://localhost/mydb';
    const opts = { ...defaultOpts };

    middleware({ uri });

    expect(openUriMock).toHaveBeenCalledWith(uri, opts);
  });

  it(`should call connect with a given url`, () => {
    const { openUriMock } = mongooseSetup();

    const url = 'mongodb://localhost:123/mydb';
    const opts = { ...defaultOpts };

    middleware({ url });

    expect(openUriMock).toHaveBeenCalledWith(url, opts);
  });

  it(`should call connect with a url containing a valid username and password`, () => {
    const { openUriMock } = mongooseSetup();

    const user = 'apples';
    const pass = '123456';

    const url = `mongodb://${user}:${pass}@localhost:27017/default?authSource=admin`;
    const opts = { ...defaultOpts };

    middleware({ user, pass });

    expect(openUriMock).toHaveBeenCalledWith(url, opts);
  });

  it(`should load all schemas`, () => {
    const { SchemaMock } = mongooseSetup();

    middleware({
      schemas: {
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
    });

    expect(SchemaMock).toHaveBeenCalledTimes(2);
    expect(SchemaMock.mock.calls[0][0]).toEqual({ name: { type: String }, pets: ['ObjectId'] });
    expect(SchemaMock.mock.calls[0][1]).toEqual({ collection: 'users' });
    expect(SchemaMock.mock.calls[1][0]).toEqual({ type: { type: String }, name: { type: String } });
    expect(SchemaMock.mock.calls[1][1]).toEqual({ collection: 'pets' });
  });

  it(`should load all events`, () => {
    const { onMock } = mongooseSetup();

    const error = jest.fn();
    const connected = jest.fn();

    middleware({ events: { error, connected }, useDefaultErrorHandler: false });

    expect(onMock).toHaveBeenCalledTimes(2);
    expect(onMock).toHaveBeenCalledWith('error', error);
    expect(onMock).toHaveBeenCalledWith('connected', connected);
  });

  it(`should apply the default error handler`, () => {
    const { onMock, closeMock } = mongooseSetup();

    middleware();

    expect(onMock).toHaveBeenCalledTimes(1);

    const errorHandler = onMock.mock.calls[0][1];

    expect(() => errorHandler('some error')).toThrow('some error');

    expect(closeMock).toHaveBeenCalledTimes(1);
  });

  it(`should add the model and document functions to the context`, () => {
    mongooseSetup();
    const ctx = {};
    const next = jest.fn();

    const koaMongoose = middleware();
    koaMongoose(ctx, next);

    expect(ctx).toHaveProperty('model');
    expect(ctx).toHaveProperty('document');
    expect(typeof ctx.model).toBe('function');
    expect(typeof ctx.document).toBe('function');
  });

  it(`calling ctx.model should return a provided model`, () => {
    const { modelMocks } = mongooseSetup();
    const throwMock = jest.fn();
    const ctx = { throw: throwMock };
    const next = jest.fn();

    const koaMongoose = middleware({ schemas: { users: () => 'users-model-instance' } });
    koaMongoose(ctx, next);

    expect(ctx.model('users')).toBe('users-model-instance');
    expect(modelMocks.users).toBe('users-model-instance');
  });

  it(`should throw an error if the ctx.model() function has an error`, () => {
    mongooseSetup();
    const throwMock = jest.fn();
    const ctx = { throw: throwMock };
    const next = jest.fn();

    const koaMongoose = middleware();
    koaMongoose(ctx, next);

    ctx.model('users');

    expect(throwMock).toHaveBeenCalledTimes(1);
    expect(throwMock).toHaveBeenCalledWith(500, new Error(`Model name 'users' not found in 'default'`));
  });

  it(`calling ctx.document should return a provided model document`, () => {
    const { SchemaMock } = mongooseSetup();
    const throwMock = jest.fn();
    const ctx = { throw: throwMock };
    const next = jest.fn();
    const document = { test: 'test' };

    const koaMongoose = middleware({ schemas: { users: ({ Schema }) => Schema } });
    koaMongoose(ctx, next);

    ctx.document('users', document);

    expect(SchemaMock).toHaveBeenCalledWith(document);
  });
});
