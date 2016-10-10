var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();
const Application = mongoose.model('Application');
const Dependency = mongoose.model('Dependency');
const DependencyVersion = mongoose.model('DependencyVersion');

var renderIndex = (req, res, next) => {
  res.locals.applications = true;

  var query = {hidden: false};

  if (req.session.admin) {
    query = {};
  }

  Application.find(query)
      .sort({type: 1, title: -1})
      .then(apps => {
        return res.render('index', {applications: apps});
      }, next);
};

var resultOrError = (res) => {
  return (result) => {
    if (!result) return res.sendStatus(404);
    return result;
  }
};

var findApplication = (id, match, res) => {
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

var buildChangelog = (app) => {
  var changelog = "";

  app.versions.forEach(version => {
    if (version.changelog)
      changelog += version.changelog + "\n\n\n";
  });

  app.changelog = changelog;

  return app;
};

var buildDependencyList = (app) => {
  // Build list of dependencies
  app.dependencies = [];
  app.versions.forEach(version => {
    version.compatible.forEach(dep => {
      if (dep.type.filterable) {
        if (app.dependencies.indexOf(dep) === -1)
          app.dependencies.push(dep);
      }
    });
  });

  return app;
};

var renderApp = function (req, res, next, showNightly, showAll, showHidden) {
  res.locals.nightly = showNightly;
  var query = {nightly: showNightly};
  if (!showHidden) {
    query.hidden = {$ne: true}
  }

  findApplication(req.params.id, query, res)
    .then(app => {
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

router.get('/nightly', (req, res, next) => {
  res.locals.nightly = true;

  renderIndex(req, res, next);
});

router.get("/icon/:id", (req, res, next) => {
  Application.findOne({id: req.params.id}).then(app => {
    if (!app) return res.sendStatus(404);

    return res.sendFile(__dirname.replace("routes", "") + "/" + app.icon);
  })
});

router.get("/app/:id", (req, res, next) => {
  renderApp(req, res, next, false, false);
});

router.get("/app/:id/all", (req, res, next) => {
  renderApp(req, res, next, false, true, true);
});

router.get("/nightly/:id", (req, res, next) => {
  renderApp(req, res, next, true, true);
});

router.get("/app/:id/:deptype/:depver", (req, res, next) => {
  Dependency.findOne({name: req.params.deptype})
    .then(resultOrError(res))
    .then(dep => {
      return DependencyVersion.findOne({version: req.params.depver});
    })
    .then(resultOrError(res))
    .then(depVer => {
      return findApplication(req.params.id, {hidden: {$ne: true}, nightly: false}, res)
          .then(app => { return {app: app, versionId: depVer._id.toString()} });
    })
    .then(function (obj) {
      var app = obj.app;
      var versionId = obj.versionId;

      var versionsToShow = [];

      // Filter show only latest of each minor version.
      app.versions.forEach(ver => {
        ver.compatible.forEach(depversion => {
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