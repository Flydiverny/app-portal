const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Application = mongoose.model('Application');
const Version = mongoose.model('Version');
const Dependency = mongoose.model('Dependency');
const DependencyVersion = mongoose.model('DependencyVersion');
const escapeStringRegexp = require('escape-string-regexp');

const queryPromise = function(reqQuery, params) {
  let query = { released: true, downloadable: true };

  if (reqQuery.force !== undefined) {
    query = {};
  }

  if (params.filename) {
    query.filename = filenameToInsensitive(params.filename);
  }

  let promise = Promise.resolve(query);

  if (params.app) {
    promise = promise
      .then(result => Application.findOne({ id: params.app }, '_id'))
      .then(app => {
        query.app = app._id;

        return query;
      });
  }

  if (params.deptype && params.depver) {
    promise = promise
      .then(r => Dependency.findOne({ name: params.deptype }, '_id'))
      .then(dep =>
        DependencyVersion.findOne(
          { type: dep._id, version: params.depver },
          '_id'
        )
      )
      .then(function(depVer) {
        query.compatible = depVer._id;

        return query;
      });
  }

  return promise;
};

const downloadFile = function(req, res, next) {
  return queryPromise(req.query, req.params)
    .then(query =>
      Version.findOne(query, 'apk filename downloads').sort({ sortingCode: -1 })
    )
    .then(version => {
      const options = {
        root: __dirname.replace('routes', ''),
        headers: {
          'Content-Type': 'application/vnd.android.package-archive',
          'Content-Disposition':
            'attachment; filename="' + version.filename + '"',
        },
      };

      res.sendFile(version.apk, options);

      return version;
    })
    .then(version => {
      version.downloads++;
      version.save((err, result) => {
        if (err) console.error('Failed updating download count for ' + version);
      });

      return version;
    })
    .catch(catcher(req, res));
};

const getMeta = function(req, res, next) {
  return queryPromise(req.query, req.params)
    .then(query =>
      Version.findOne(query, 'name compatible')
        .populate({
          path: 'compatible',
          select: 'version type',
          options: {
            sort: { version: -1 },
          },
          populate: {
            path: 'type',
            select: 'name',
          },
        })
        .sort({ sortingCode: -1 })
    )
    .then(version => {
      const response = {
        version: version.name,
        compatible: {},
      };

      version.compatible.forEach(v => {
        if (!response.compatible[v.type.name]) {
          response.compatible[v.type.name] = [];
        }

        response.compatible[v.type.name].push(v.version);
      });

      res.set('Content-Type', 'application/json');
      res.send(response);
      /*	res.send();*/

      return version;
    })
    .catch(catcher(req, res));
};

const catcher = function(req, res) {
  return err => {
    console.error('Failed on path: ' + req.path + ' with err: ' + err);
    console.error(err.stack);
    res.sendStatus(404);

    return value;
  };
};

const filenameToInsensitive = function(filename) {
  return new RegExp('^' + escapeStringRegexp(filename) + '$', 'i');
};

router.get('/', function(req, res, next) {
  let query = { released: true, hidden: false, nightly: false };

  if (req.session.admin) {
    query = { nightly: false };
  }

  Application.find({ hidden: { $ne: true } })
    .select('_id')
    .then(apps => {
      query.app = { $in: apps };

      return Version.find(query)
        .select('name filename app changelog released downloadable')
        .sort({ _id: -1 })
        .populate({ path: 'app', select: 'id title' })
        .limit(10);
    })
    .then(apps => res.render('download', { versions: apps }))
    .catch(next);
});

router.get('/:filename', downloadFile);
router.get('/:filename/meta', getMeta);

router.get('/:app/latest', downloadFile);
router.get('/:app/:filename', downloadFile);
router.get('/:app/latest/meta', getMeta);
router.get('/:app/:filename/meta', getMeta);

router.get('/:deptype/:depver/:filename', downloadFile);
router.get('/:deptype/:depver/:filename/meta', getMeta);

router.get('/:app/:deptype/:depver/latest', downloadFile);
router.get('/:app/:deptype/:depver/:filename', downloadFile);
router.get('/:app/:deptype/:depver/latest/meta', getMeta);
router.get('/:app/:deptype/:depver/:filename/meta', getMeta);

module.exports = router;
