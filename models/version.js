const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const VersionSchema = new Schema({
  name: { type: String, required: true },
  app: { type: Schema.Types.ObjectId, ref: 'Application', required: true },
  apk: { type: String, required: true, unique: true },
  filename: { type: String, required: true, unique: true },
  sortingCode: { type: Number, required: true },
  compatible: { type: [{ type: Schema.Types.ObjectId, ref: 'DependencyVersion' }], default: [] },
  nightly: { type: Boolean, required: true },
  mapping: { type: String },
  changelog: { type: String },
  downloads: { type: Number, default: 0 },

  /**
   * Whether the app version has been released or not, ie changelog is shown even if app is hidden
   *
   * If released
   *  - Versions changelog is visible
   * else
   *  - Versions changelog is not visible
   *  - Version is not listed
   *  - Version is not downloadable
   **/
  released: { type: Boolean, required: true, default: false },

  /**
   * Whether an app version should be listed on the portal or not
   *
   * If hidden
   *  - Version is not shown in lists
   * else
   *  - Version is shown in list
   **/
  hidden: { type: Boolean, required: true, default: false },

  /**
   *  Whether the app version should be downloadable, ie even if app is released should it be downloadable?
   *
   * If downloadable
   *  - Version is downloadable
   * else
   *  - Version is not downloadable
   **/
  downloadable: { type: Boolean, required: true, default: true }
});

mongoose.model('Version', VersionSchema);
