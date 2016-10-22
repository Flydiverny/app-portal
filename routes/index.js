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

var resultOrError = (result) => {
  if (!result) throw new Error("No result");
  return result;
};

var buildChangelog = (app) => {
  app.changelog = app.versions.filter(ver => ver.changelog).map(ver => ver.changelog);

  return app;
};

var buildDependencyList = (app) => {
  // Build list of dependencies
  app.dependencies = app.versions
      .filter(version => !version.hidden)
      .map(version => version.compatible.filter(dep => dep.type.filterable))
      .reduce((a, b) => a.concat(b))
      .filter((dep, i, self) => self.indexOf(dep) === i);

  return app;
};

var renderApp = function (showNightly, showAll, showHidden) {
  return (req, res, next) => {
    queryApplication(req, res, next, showNightly)
        .then(app => {
          if (!showAll) {
            var versionsCode = [];
            var versionsToShow = [];

            // Filter show only latest of each minor version.
            app.versions.forEach(function (ver) {
              var index = versionsCode.indexOf(Math.floor(ver.sortingCode / 100) * 100);
              if (index === -1) {
                if (ver.downloadable && (showHidden || !ver.hidden)) {
                  ver.collectedChangelog = [];
                  ver.collectedChangelog.push(ver.changelog);
                  versionsToShow.push(ver);
                  versionsCode.push(Math.floor(ver.sortingCode / 100) * 100);
                }
              } else if (ver.changelog) {
                versionsToShow[index].collectedChangelog.push(ver.changelog);
              }
            });

            app.versions = versionsToShow;
          }

          return app;
        })
        .then(app => {
          return res.render("application", app);
        })
        .catch(next);
  }
};

var queryApplication = function (req, res, next, showNightly) {
  res.locals.nightly = showNightly;
  var query = { nightly: showNightly };

  if (!res.locals.session.admin) {
    query.released = true;
  }

  return Application.findOne({id: req.params.id})
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
        select: 'name changelog hidden filename compatible sortingCode downloads downloadable released',
        match: query,
        options: {
          sort: {sortingCode: -1}
        }
      })
      .then(buildDependencyList)
      .then(buildChangelog)
      .catch(next);
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

router.get("/app/:id", renderApp(false, false));

router.get("/app/:id/all", renderApp(false, true, true));

router.get("/nightly/:id", renderApp(true, true));

router.get("/app/:id/:deptype/:depver", (req, res, next) => {
  Dependency.findOne({name: req.params.deptype})
    .then(resultOrError)
    .then(dep => DependencyVersion.findOne({version: req.params.depver}))
    .then(resultOrError)
    .then(depVer => {
      return queryApplication(req, res, next, false)
          .then(app => { return {app: app, depVer: depVer} })
    })
    .then(function (obj) {
      var app = obj.app;
      var depVerId = obj.depVer;

      app.versions = app.versions
          .filter(ver => !ver.hidden)
          .filter(ver => ver.compatible
              .filter(depVer => depVer.equals(depVerId)).length == 1);

      return res.render("application", app);
    })
    .catch(next);
});

module.exports = router;