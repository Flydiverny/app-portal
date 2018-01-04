const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ApplicationSchema = new Schema({
  id: { type: String, required: true, unique: true },
  type: { type: String, required: true, enum: ['android', 'ios'] },
  icon: { type: String, required: true },
  title: { type: String, required: true, unique: true },
  versions: {
    type: [{ type: Schema.Types.ObjectId, ref: 'Version' }],
    default: [],
  },
  link: { type: String },
  hidden: { type: Boolean, default: false },
});

mongoose.model('Application', ApplicationSchema);
