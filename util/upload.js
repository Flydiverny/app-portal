var mkdirp = require('mkdirp');
var multer = require('multer');

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        var dir = 'uploads/';
        mkdirp(dir, function(e) {
            if (e) {
                console.error(e);
                cb(new Error("fs error plz"));
            } else {
                cb(null, dir);
            }
        });
    }
});

module.exports = storage;