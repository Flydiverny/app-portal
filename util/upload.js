const mkdirp = require('mkdirp');
const multer = require('multer');

const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const dir = 'uploads/';
    mkdirp(dir, function(e) {
      if (e) {
        console.error(e);
        cb(new Error('fs error plz'));
      } else {
        cb(null, dir);
      }
    });
  },
});

module.exports = storage;
