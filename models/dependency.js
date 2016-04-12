const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DependencySchema = new Schema({
  name: { type: String, required: true, unique: true },
  versions: { type: [{ type: Schema.Types.ObjectId, ref: 'DependencyVersion' }], default: [] }
});

mongoose.model('Dependency', DependencySchema);
