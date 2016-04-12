var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();
const Application = mongoose.model('Application');
const Dependency = mongoose.model('Dependency');

var renderIndex = function(req, res, next) {
  console.log("Render index!");
  Application.find({ hidden: false }).sort({ type: 1, title : -1 }).then(function(apps) {
    return res.render('index', {applications: apps});
  }, next);
}

var renderApp = function(req, res, next, showNightly, showAll) {
  res.locals.nightly = showNightly;

  Application.findOne({ id: req.params.id })
  .populate({
    path: 'versions',
    populate: { path : 'compatible', populate: { path: 'type', select: 'name' } },
    select: 'name changelog filename compatible sortingCode',
    match: { hidden: { $ne: true }, nightly: showNightly },
    options: {
      sort: { sortingCode: -1 }
    }
  })
  .then(function(app) {
    if (!app) return res.sendStatus(404);

    if (!showAll) {
      var versionsCode = [];
      var versionsToShow = [];
      app.versions.forEach(function(ver) {
        console.log(Math.floor(ver.sortingCode / 100) * 100);
        if (versionsCode.indexOf(Math.floor(ver.sortingCode / 100) * 100) === -1) {
          versionsToShow.push(ver);
          versionsCode.push(Math.floor(ver.sortingCode / 100) * 100);
        }
      });

      app.versions = versionsToShow;
    }

    app.dependencies = [];
    app.versions.forEach(function(version) {
      version.compatible.forEach(function(dep) {
        if (app.dependencies.indexOf(dep) === -1)
          app.dependencies.push(dep);
      });
    });

    console.log(app);

    return res.render("application", app);
  })
}

/* GET home page. */
router.get('/', renderIndex);

router.get('/nightly', function(req, res, next) {
  res.locals.nightly = true;

  renderIndex(req, res, next);
});

router.get("/icon/:id", function(req, res, next) {
  Application.findOne({ id: req.params.id }).then(function(app) {
    if (!app) return res.sendStatus(404);

    return res.sendFile(__dirname.replace("routes", "") + "/"+ app.icon);
  })
});

router.get("/app/:id", function(req, res, next) {
  renderApp(req, res, next, false);
});

router.get("/app/:id/all", function(req, res, next) {
  renderApp(req, res, next, false, true);
});

router.get("/nightly/:id", function(req, res, next) {
  renderApp(req, res, next, true, true);
});

router.get("/app/:id/:tes", function(req, res, next) {
  Dependency.findOne({name: req.params.tes })
  .then(function(dep) {
    if(!dep) res.sendStatus(404);

    return dep;
  })
  .then(function(dep) {
    return Application.findOne({ id: req.params.id })
    .populate({
      path: 'versions',
      match: { hidden: { $ne: true }, compatible : { $in : [dep._id]} },
      options: {
        sort: { sortingCode: -1 }
      },
      populate: { path : 'compatible', }
    });
  })
  .then(function(app) {
    if (!app) res.sendStatus(404);

    app.dependencies = [];
    app.versions.forEach(function(version) {
      version.compatible.forEach(function(dep) {
        if (app.dependencies.indexOf(dep) === -1)
          app.dependencies.push(dep);
      });
    });

    app.versions.filter(function(version) {
      return
    });

    return res.render("application", app);
  });
});

module.exports = router;

