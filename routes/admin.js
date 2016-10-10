var express = require('express');
var mongoose = require('mongoose');
var multer = require('multer');
var router = express.Router();
var fs = require('fs');
var mkdirp = require('mkdirp');
var Promise = require("bluebird");
const Application = mongoose.model('Application');
const Version = mongoose.model('Version');
const Dependency = mongoose.model('Dependency');
const auth = require('../middleware/auth');
const storage = require('../util/upload');
const DependencyVersion = mongoose.model('DependencyVersion');
const config = require('../util/config');

const username = config.username || "admin";
const password = config.password || "Private!";

var isNightly = (filename) => {
  return filename.indexOf('rev') > -1 || filename.indexOf('NIGHTLY') > -1 || filename.indexOf('SNAPSHOT') > -1;
};

var sortingCode = (apk) => {
  console.log("Generating sorting code!");
  var ext = apk.indexOf(".apk");
  var filename = apk.substring(0, ext);

  if (filename.indexOf('NIGHTLY') > -1) {
    let tokens = filename.split("_");
    // tokens[2] = "2016-01-01"
    return parseInt(tokens[2].split('-').join(''));
  }

  if (filename.indexOf('rev') > -1) {
    let tokens = filename.split("_");
    // tokens[2] = "rev2801"
    return parseInt(tokens[2].replace("rev", ""));
  }

  var snap = filename.indexOf('-');

  if (snap > -1)
    filename = filename.substring(0, snap);

  let tokens = filename.split("_");
  var version = tokens[1].split('.');

  return (parseInt(version[0]) * 10000) + (parseInt(version[1])*100) + parseInt(version[2]);
};

var saveFile = function(file) {
  console.log("Creating promise!");
  return new Promise((resolve, reject) => {
    console.log("Running promise!");
    var filename = file.originalname;
    var ext = filename.indexOf(".apk");

    if (ext === -1)
      return;

    filename = filename.substring(0, ext);
    var tokens = filename.split("_"); // [0] = "AppPortal", [1] = "2.0.0"
    console.log(tokens);
    if (tokens.length < 2)
      return reject("Filename doesn't match expected format");

    Application.findOne({ id: tokens[0] })
        .then((app) => {
          if (!app) return reject("Unknown application");

          var version = new Version({
            name: tokens[1] + (tokens.length > 2 ? " " + tokens[2] : ""),
            app: app._id,
            filename: file.originalname,
            apk: file.path,
            sortingCode: sortingCode(file.originalname),
            nightly: isNightly(file.originalname)
          }).save((err, versionResult) => {
            if(err) return reject(err);

            app.versions.push(versionResult._id);
            app.save((err, result) => {
              if(err) return reject(err);
              return resolve(versionResult);
            });
          });
        });
  });
};

var mapFiles = (files) => {
  return Promise.map(files, saveFile);
};

var uploadApk = multer({
  storage: storage,
  fileFilter: function fileFilter (req, file, cb) {
    if(file.originalname.endsWith(".apk")
      && file.originalname.indexOf("DEBUG") === -1)
      cb(null, true);
    else
      cb(null, false)
  }
});

router.get('/login', (req, res, next) => { res.redirect('/admin') });

router.post('/login', (req, res, next) => {
  if (req.body.username !== username || req.body.password !== password) {
    req.session.regenerate((err) => {
      req.flash("danger", "Invalid credentials");
      return res.render('admin/login');
    });
  } else {
    req.session.admin=true;
    return res.redirect('/admin');
  }
});

router.get('/logout', auth, (req, res, next) => {
  req.session.destroy();
  res.redirect('/');
});

router.get('/newVersion', auth, (req, res, next) => {
  return res.render('admin/newVersion');
});

router.post('/newVersion', auth, uploadApk.array('apk'), (req, res, next) => {
  console.log("New version posted!");
  if (req.files.length === 0){
    console.log("New version no joy!");
    req.flash("warning", "No file specified!");
    return res.redirect("/admin/newVersion");
  }

  mapFiles(req.files).then((results) => {
    console.log("SUCCESS??");
    req.flash("success", "All files successfully uploaded!");
    res.redirect("/admin/newVersion");
  }, (results) => {
    console.log("ERROR??");
    req.flash("danger", JSON.stringify(results));
    res.redirect("/admin/newVersion");
  });
});

router.get('/editVersion/:id', auth, (req, res, next) => {
  Version.findOne({_id: req.params.id})
    .populate('app compatible')
    .then((version) => {
      if (!version) return res.sendStatus(404);

      DependencyVersion.find().select('version type').populate({
        path: 'type',
        select: 'name'
      }).then((results) => {
        return res.render('admin/editVersion', { version: version, dependencies: results });
      });
    });
});

router.post('/editVersion/:id', auth, (req, res, next) => {
  Version.findOne({_id: req.params.id}).then((version) => {
    if (!version) return res.sendStatus(404);

    version.compatible = req.body.dependency;
    version.hidden = req.body.hidden ? true : false;
    version.changelog = req.body.changelog;

    version.save((err, result) => {
      if (err) return res.sendStatus(500);
      req.flash("All good!");
      res.redirect("/");
    });
  });
});



router.get('/', (req, res, next) => {
  if (req.session.admin) {
    return res.render('admin/home');
  } else {
    return res.render('admin/login')
  }
});

module.exports = router;
