var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();
const Application = mongoose.model('Application');
const Version = mongoose.model('Version');
const Dependency = mongoose.model('Dependency');
const DependencyVersion = mongoose.model('DependencyVersion');

var allInclusive = function(req, res, next) {
	var query = { hidden: false, nightly: false };

	if (req.params.filename) {
		query.filename = filenameToInsensitive(req.params.filename);
	}

	var promise = Promise.resolve(true);

	if (req.params.app) {
		promise = promise
			.then(result => Application.findOne({ id: req.params.app }, '_id'))
			.then(app => {
				query.app = app._id;
			});
	}

	if (req.params.deptype && req.params.depver) {
		promise = promise
			.then(r => Dependency.findOne({name: req.params.deptype }, '_id'))
			.then(dep => DependencyVersion.findOne({ type: dep._id, version: req.params.depver }, '_id'))
			.then(function(depVer) {
				query.compatible = depVer._id;
			});
	}

	return promise
		.then(r => Version.findOne(query, 'name apk filename downloads').sort({ sortingCode : -1}))
		.then(version => {
			if (!version) {
				throw new Error("No result available");
			}

			return version;
		})
		.catch(catcher(req, res));
};

var downloadFile = function(req, res, next) {
	return allInclusive(req, res, next)
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

var getMeta = function(req, res, next) {
	return allInclusive(req, res, next)
		.then((version) => {
			var fullUrl = req.protocol + '://' + req.get('host');

			console.log(req);
			res.set('Content-Type', 'application/json');
			res.send({
				version: version.name,
				download: fullUrl + "/" + version.filename
			});

			return version;
		})
};

var catcher = function(req, res) {
	return (err) => {
		console.error("Failed on path: " + req.path + " with err: " + err);
		res.sendStatus(404);

		return value;
	}
};

var filenameToInsensitive = function(filename) {
	return new RegExp("^" + filename + "$", "i");
};

router.get('/', function(req, res, next) {

	var query = {hidden: false, nightly: false};

	if (req.session.admin) {
		query = {nightly: false};
	}

	Application.find({hidden: {$ne: true}})
		.select("_id")
		.then(apps => {
			query.app = { $in : apps };

			return Version.find(query)
				.select('name filename app changelog')
				.sort({_id: -1})
				.populate({path: 'app', select: 'id title hidden' })
				.limit(10);
		})
		.then(apps => {
			return res.render('download', {versions: apps});
		})
		.catch(next);
});

router.get('/:filename', downloadFile);
router.get('/:filename/meta', getMeta);

router.get('/:app/latest', downloadFile);
router.get('/:app/:filename', downloadFile);
router.get('/:app/latest/meta', getMeta);
router.get('/:app/:filename/meta', getMeta);

router.get('/:deptype/:depver/latest', downloadFile);
router.get('/:deptype/:depver/:filename', downloadFile);
router.get('/:deptype/:depver/latest/meta', getMeta);
router.get('/:deptype/:depver/:filename/meta', getMeta);

router.get('/:app/:deptype/:depver/latest', downloadFile);
router.get('/:app/:deptype/:depver/:filename', downloadFile);
router.get('/:app/:deptype/:depver/latest/meta', getMeta);
router.get('/:app/:deptype/:depver/:filename/meta', getMeta);

module.exports = router;
