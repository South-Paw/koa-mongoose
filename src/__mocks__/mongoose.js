const mongoose = {};

function __setupCreateConnectionMock(createConnection) {
  mongoose.createConnection = createConnection;
}

mongoose.__setupCreateConnectionMock = __setupCreateConnectionMock;

module.exports = mongoose;
