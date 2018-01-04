const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DependencyVersionSchema = new Schema({
  version: { type: String, required: true },
  color: { type: String, required: true, unique: true },
  type: { type: Schema.Types.ObjectId, ref: 'Dependency', required: true },
});

mongoose.model('DependencyVersion', DependencyVersionSchema);
