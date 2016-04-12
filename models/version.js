const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const VersionSchema = new Schema({
  name: { type: String, required: true, unique: true },
  app: { type: Schema.Types.ObjectId, ref: 'Application', required: true },
  apk: { type: String, required: true, unique: true },
  filename: { type: String, required: true, unique: true },
  sortingCode: { type: Number, required: true },
  compatible: { type: [{ type: Schema.Types.ObjectId, ref: 'DependencyVersion' }], default: [] },
  hidden: { type: Boolean, required: true, default: false },
  nightly: { type: Boolean, required: true },
  mapping: { type: String },
  changelog: { type: String }
});

mongoose.model('Version', VersionSchema);
