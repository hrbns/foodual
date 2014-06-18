var mongoose = require('mongoose');

var jobSchema = new mongoose.Schema({
  key: String,
  progress: { type: Number, min: 0, max: 100 },
  data: Array
});
module.exports = mongoose.model('Job', jobSchema);
