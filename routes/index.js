const express = require('express');
const _ = require('lodash');
const mongoose = require('mongoose');
const router = express.Router();
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
    .then(apps => res.render('index', {applications: apps}))
    .catch(next);
};

var resultOrError = (result) => {
  if (!result) throw new Error("No result");
  return result;
};

var buildChangelog = (app) => ({
  ...app,
  changelog: app.versions.map(ver => ver.changelog).filter(d => d),
});

var buildDependencyList = (app) => {
  // Build list of dependencies
  const filteredDependencies = app.versions
      .filter(version => !version.hidden)
      .map(version => version.compatible.filter(dep => dep.type.filterable))
      .reduce((a, b) => a.concat(b), [])
      .filter((dep, i, self) => self.indexOf(dep) === i);

  return {
    ...app,
    dependencies: _.toPairs(_.groupBy(filteredDependencies, (dep) => dep.type.name)),
  };
};

var renderApp = function (showNightly, showAll, showHidden) {
  return (req, res, next) => {
    queryApplication(req, res, next, showNightly)
      .then(app => {
        if (showAll) {
          return app;
        }

        const versionsCode = [];
        const versionsToShow = [];

        // Filter show only latest of each minor version.
        app.versions.forEach((ver) => {
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

        return {
          ...app,
          versions: versionsToShow,
        };
      })
      .then(app => res.render("application", app))
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
    .then(resultOrError)
    .then((app) => app.toObject())
    .then(buildDependencyList)
    .then((app) => ({
      ...app,
      versions: app.versions.map(({compatible, ...version}) => ({
        ...version,
        compatible: _.toPairs(_.groupBy(compatible, (dep) => dep.type.name)),
      }))
    }))
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
    .then(depVer =>
      queryApplication(req, res, next, false)
        .then(app => { return {app, depVer} })
    )
    .then(({app, depVer}) => {
      const versions = app.versions
        .filter(ver => !ver.hidden)
        .filter(ver => ver.compatible
          .filter(depVer => depVer.equals(depVerId)).length == 1);

      return res.render("application", {...app, versions});
    })
    .catch(next);
});

module.exports = router;
