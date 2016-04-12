var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();
const Application = mongoose.model('Application');
const Version = mongoose.model('Version');
const Dependency = mongoose.model('Dependency');

var returnFile = function(res) {
	return function(version) {
		if (!version) return res.sendStatus(404);

		var options = {
			root: __dirname.replace("routes", ""),
			headers: {
				'Content-Type': 'application/octet-stream',
				'Content-Disposition': 'filename="' + version.filename + '"'
			}
		};

		return res.sendFile(version.apk, options);
	}
};

var returnOrError = function(res) {
	return function(value) {
			if (!value) return res.sendStatus(404);
			return value;
	}
};

router.get('/:filename', function(req, res, next) {
	Version.findOne({ filename: req.params.filename }).then(returnFile(res));
});

//router.get('/:deptype/:depver/:filename', function(req, res, next) {
//	Dependency.findOne({ name: req.params.tes })
//		.then(returnOrError(res))
//		.then(function(tes) {
//			return Version.findOne({ filename: req.params.filename, compatible: tes._id })
//		})
//		.then(returnFile(res));
//});
//
//router.get('/:app/latest', function(req, res, next) {
//	Application.findOne({ id: req.params.app }, '_id')
//	.then(returnOrError(res))
//	.then(function(app) {
//		return Version.findOne({ app: app._id, hidden: false, nightly: false }, 'apk filename').sort({ sortingCode : -1});
//	})
//	.then(returnFile(res));
//});
//
//router.get('/:deptype/:depver/:app/latest', function(req, res, next) {
//	Application.findOne({ id: req.params.app }, '_id')
//	.then(returnOrError(res))
//	.then(function(app) {
//		return Dependency.findOne({ name: req.params.tes }, '_id')
//			.then(returnOrError(res))
//			.then(function(tes) {
//				return [app, tes];
//			});
//	})
//	.then(function(args) {
//		return Version.findOne({ app: args[0]._id, compatible : args[1]._id, hidden: false, nightly: false }, 'apk filename').sort({ sortingCode : -1});
//	})
//	.then(returnFile(res));
//});
//
//router.get('/:deptype/:depver/:app/:filename', function(req, res, next) {
//	Application.findOne({ id: req.params.app }, '_id')
//	.then(returnOrError(res))
//	.then(function(app) {
//		return Dependency.findOne({ name: req.params.tes }, '_id')
//			.then(returnOrError(res))
//			.then(function(tes) {
//				return [app, tes];
//			});
//	})
//	.then(function(args) {
//		return Version.findOne({ filename: req.params.filename, app: args[0]._id, compatible : args[1]._id }, 'apk filename');
//	})
//	.then(returnFile(res));
//});

module.exports = router;
