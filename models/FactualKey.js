var mongoose = require('mongoose');

var factualKeySchema = new mongoose.Schema({
  key: String,
  secret: String,
});

module.exports = mongoose.model('FactualKey', factualKeySchema);
