var mongoose = require('mongoose');
var router = require('express').Router();
const auth = require('../../middleware/auth');
const Dependency = mongoose.model('Dependency');
const DependencyVersion = mongoose.model('DependencyVersion');

var randomColor = function() {
    return "#000000".replace(/0/g,function(){return (~~(Math.random()*16)).toString(16);})
};

router.get('/dependency', auth, function(req, res, next) {
    return res.render('admin/addDependency');
});

router.post('/dependency', auth, function(req, res, next) {
    var dep = new Dependency({
        name: req.body.name
    }).save(function(err, result) {
        if (err) {
            req.flash("danger", JSON.stringify(err));
        } else {
            req.flash("success", "Dependency Type added!");
        }

        return res.redirect('/admin/dependency');
    });
});


router.get('/dependencyVersion', auth, function(req, res, next) {
    Dependency.find()
        .then(function(result) {
            return res.render('admin/addDependencyVersion', { types : result });
        }, next);
});

router.post('/dependencyVersion', auth, function(req, res, next) {
    console.log(req.body);
    Dependency.findOne({_id: req.body.version})
        .then(function (dep) {
            new DependencyVersion({
                version: req.body.version,
                type: req.body.type,
                color: req.body.color || randomColor()
            }).save(function (err, version) {
                if (err) {
                    req.flash("danger", JSON.stringify(err));
                } else {
                    req.flash("success", "Dependency Version added!");
                }

                dep.versions.push(version._id);
                dep.save(function (err, saved) {
                    return res.redirect('/admin/dependencyVersion');
                });
            });
        }, next);
});

module.exports = router;
