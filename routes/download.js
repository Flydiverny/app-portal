var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();
const Application = mongoose.model('Application');
const Version = mongoose.model('Version');
const Dependency = mongoose.model('Dependency');
const DependencyVersion = mongoose.model('DependencyVersion');

var findDependency = function(res, type, ver) {
    return Dependency.findOne({name: type })
        .then(resultOrError(res))
        .then(dep => DependencyVersion.findOne({ type: dep._id, version: ver }))
        .then(resultOrError(res));
};

var findAndReturnFile = function(res, query) {
    return Version.findOne(query, 'apk filename')
        .sort({ sortingCode : -1})
        .then(returnFile(res));
};

var returnFile = function(res) {
	return function(version) {
		if (!version) return res.sendStatus(404);

		var options = {
			root: __dirname.replace("routes", ""),
			headers: {
				'Content-Type': 'application/vnd.android.package-archive',
				'Content-Disposition': 'attachment; filename="' + version.filename + '"'
			}
		};

		return res.sendFile(version.apk, options);
	}
};

var resultOrError = function(res) {
	return function(value) {
			if (!value) return res.sendStatus(404);
			return value;
	}
};

var filenameToInsensitive = function(filename) {
	return new RegExp(filename, "i");
};

router.get('/:filename', function(req, res, next) {
    findAndReturnFile(res, { filename: filenameToInsensitive(req.params.filename) });
});

router.get('/:deptype/:depver/:filename', function(req, res, next) {
    findDependency(res, req.params.deptype, req.params.depver)
        .then(function(depVer) {
			return findAndReturnFile(res, { filename: filenameToInsensitive(req.params.filename), compatible: depVer._id })
		});
});

router.get('/:app/latest', function(req, res, next) {
	Application.findOne({ id: req.params.app }, '_id')
	.then(resultOrError(res))
	.then(function(app) {
		return findAndReturnFile(res, { app: app._id, hidden: false, nightly: false });
	});
});


router.get('/:deptype/:depver/:app/latest', function(req, res, next) {
	Application.findOne({ id: req.params.app }, '_id')
	.then(resultOrError(res))
	.then(function(app) {
		return findDependency(res, req.params.deptype, req.params.depver)
            .then(function(depVer) {
                return findAndReturnFile(res, { app: app._id, compatible : depVer._id, hidden: false, nightly: false });
			});
	});
});

router.get('/:deptype/:depver/:app/:filename', function(req, res, next) {
    Application.findOne({ id: req.params.app }, '_id')
        .then(resultOrError(res))
        .then(function(app) {
            return findDependency(res, req.params.deptype, req.params.depver)
                .then(function(depVer) {
                    return findAndReturnFile(res, { filename: filenameToInsensitive(req.params.filename), app: app._id, compatible : depVer._id, hidden: false, nightly: false });
                });
        });
});

module.exports = router;
