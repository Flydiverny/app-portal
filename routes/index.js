var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();
const Application = mongoose.model('Application');
const Dependency = mongoose.model('Dependency');
const DependencyVersion = mongoose.model('DependencyVersion');

var renderIndex = function (req, res, next) {
  Application.find({hidden: false}).sort({type: 1, title: -1}).then(function (apps) {
    return res.render('index', {applications: apps});
  }, next);
};

var resultOrError = function (res) {
  return function (result) {
    if (!result) return res.sendStatus(404);
    return result;
  }
};

var findApplication = function (id, match, res) {
  return Application.findOne({id: id})
    .populate({
      path: 'versions',
      populate: {
        path: 'compatible',
        options: {
          sort: {version: -1}
        },
        populate: {
          path: 'type',
          select: 'name filterable'
        }
      },
      select: 'name changelog filename compatible sortingCode',
      match: match,
      options: {
        sort: {sortingCode: -1}
      }
    }).then(resultOrError(res))
    .then(buildDependencyList)
    .then(buildChangelog);
};

var buildChangelog = function (app) {
  var changelog = "";

  app.versions.forEach(function (version) {
    changelog += version.changelog + "\n\n\n";
  });

  app.changelog = changelog;

  return app;
};

var buildDependencyList = function (app) {
  // Build list of dependencies
  app.dependencies = [];
  app.versions.forEach(function (version) {
    version.compatible.forEach(function (dep) {
      if (dep.type.filterable) {
        if (app.dependencies.indexOf(dep) === -1)
          app.dependencies.push(dep);
      }
    });
  });

  return app;
};

var renderApp = function (req, res, next, showNightly, showAll) {
  res.locals.nightly = showNightly;

  findApplication(req.params.id, {hidden: {$ne: true}, nightly: showNightly}, res)
    .then(function (app) {
      if (!showAll) {
        var versionsCode = [];
        var versionsToShow = [];

        // Filter show only latest of each minor version.
        app.versions.forEach(function (ver) {
          var index = versionsCode.indexOf(Math.floor(ver.sortingCode / 100) * 100);
          if (index === -1) {
            versionsToShow.push(ver);
            versionsCode.push(Math.floor(ver.sortingCode / 100) * 100);
          } else if (ver.changelog) {
            versionsToShow[index].changelog += "\n\n" + ver.changelog;
          }
        });

        app.versions = versionsToShow;
      }

      return res.render("application", app);
    })
};

/* GET home page. */
router.get('/', renderIndex);

router.get('/nightly', function (req, res, next) {
  res.locals.nightly = true;

  renderIndex(req, res, next);
});

router.get("/icon/:id", function (req, res, next) {
  Application.findOne({id: req.params.id}).then(function (app) {
    if (!app) return res.sendStatus(404);

    return res.sendFile(__dirname.replace("routes", "") + "/" + app.icon);
  })
});

router.get("/app/:id", function (req, res, next) {
  renderApp(req, res, next, false, false);
});

router.get("/app/:id/all", function (req, res, next) {
  renderApp(req, res, next, false, true);
});

router.get("/nightly/:id", function (req, res, next) {
  renderApp(req, res, next, true, true);
});

router.get("/app/:id/:deptype/:depver", function (req, res, next) {
  Dependency.findOne({name: req.params.deptype})
    .then(resultOrError(res))
    .then(function (dep) {
      return DependencyVersion.findOne({version: req.params.depver});
    })
    .then(resultOrError(res))
    .then(function (depVer) {
      return findApplication(req.params.id, {hidden: {$ne: true}, nightly: false}, res).then(function (app) {
        return {app: app, versionId: depVer._id.toString()}
      });
    })
    .then(function (obj) {
      var app = obj.app;
      var versionId = obj.versionId;

      var versionsToShow = [];

      // Filter show only latest of each minor version.
      app.versions.forEach(function (ver, k) {
        ver.compatible.forEach(function (depversion) {
          if (depversion._id.toString() === versionId) {
            versionsToShow.push(ver);
            return true;
          }
        });
      });

      app.versions = versionsToShow;

      return res.render("application", app);
    });
});

module.exports = router;