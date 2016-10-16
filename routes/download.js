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
    return Version.findOne(query, 'apk filename downloads')
        .sort({ sortingCode : -1})
		.then(resultOrError(res))
        .then((version) => {
			var options = {
				root: __dirname.replace("routes", ""),
				headers: {
					'Content-Type': 'application/vnd.android.package-archive',
					'Content-Disposition': 'attachment; filename="' + version.filename + '"'
				}
			};

			res.sendFile(version.apk, options);

			return version;
		})
		.then((version) => {
			version.downloads++;
			version.save((err, result) => {
				if (err)
					console.error("Failed updating download count for " + version);
			});

			return version;
		});
};

var resultOrError = function(res) {
	return function(value) {
			if (!value) {
				res.sendStatus(404);
				throw new Error("No result available");
			}
			return value;
	}
};

var catcher = function(req) {
	return err => {
		console.error("Failed on path: " + req.path + " with err: " + err);
	}
};

var filenameToInsensitive = function(filename) {
	return new RegExp(filename, "i");
};

router.get('/', function(req, res, next) {

	var query = {hidden: false, nightly: false};

	if (req.session.admin) {
		query = {nightly: false};
	}

	Application.find({hidden: {$ne: true}})
		.select("_id")
		.then(resultOrError(res))
		.then(apps => {
			query.app = { $in : apps };

			return Version.find(query)
				.select('name filename app changelog')
				.sort({_id: -1})
				.populate({path: 'app', select: 'id title hidden' })
				.limit(10)
				.then(resultOrError(res))
				.then(apps => {
					return res.render('download', {versions: apps});
				}, next);
		})
		.catch(catcher(req));
});

router.get('/:filename', function(req, res, next) {
    findAndReturnFile(res, { filename: filenameToInsensitive(req.params.filename) })
		.catch(catcher(req));
});

router.get('/:deptype/:depver/:filename', function(req, res, next) {
    findDependency(res, req.params.deptype, req.params.depver)
        .then(function(depVer) {
			return findAndReturnFile(res, { filename: filenameToInsensitive(req.params.filename), compatible: depVer._id })
		})
		.catch(catcher(req));
});

router.get('/:app/latest', function(req, res, next) {
	Application.findOne({ id: req.params.app }, '_id')
	.then(resultOrError(res))
	.then(function(app) {
		return findAndReturnFile(res, { app: app._id, hidden: false, nightly: false });
	})
	.catch(catcher(req));
});


router.get('/:deptype/:depver/:app/latest', function(req, res, next) {
	Application.findOne({ id: req.params.app }, '_id')
	.then(resultOrError(res))
	.then(function(app) {
		return findDependency(res, req.params.deptype, req.params.depver)
            .then(function(depVer) {
                return findAndReturnFile(res, { app: app._id, compatible : depVer._id, hidden: false, nightly: false });
			});
	})
	.catch(catcher(req));
});

router.get('/:deptype/:depver/:app/:filename', function(req, res, next) {
    Application.findOne({ id: req.params.app }, '_id')
        .then(resultOrError(res))
        .then(function(app) {
            return findDependency(res, req.params.deptype, req.params.depver)
                .then(function(depVer) {
                    return findAndReturnFile(res, { filename: filenameToInsensitive(req.params.filename), app: app._id, compatible : depVer._id, hidden: false, nightly: false });
                });
        })
		.catch(catcher(req));
});

module.exports = router;
