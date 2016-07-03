var mongoose = require('mongoose');
var router = require('express').Router();
const auth = require('../../middleware/auth');
const Dependency = mongoose.model('Dependency');
const DependencyVersion = mongoose.model('DependencyVersion');

var randomColor = function() {
    return "#000000".replace(/0/g,function(){return (~~(Math.random()*16)).toString(16);})
};

router.get('/dependency', auth, function(req, res, next) {
  Dependency.find().then(function(deps) {
    return res.render('admin/dependency/index', { types: deps });
  });
});

router.get('/dependency/add', auth, function(req, res, next) {
    return res.render('admin/dependency/add');
});

router.get('/dependency/edit/:id', auth, function(req, res, next) {
  Dependency.findOne({ _id: req.params.id }).then(function(dep) {
    return res.render('admin/dependency/edit', dep);
  });
});

router.post('/dependency/edit/:id', auth, function(req, res, next) {
  Dependency.findOne({ _id: req.params.id }).then(function(dep) {
    dep.name = req.body.name;
    dep.filterable = req.body.filterable ? true : false;

    dep.save(function(err, result) {
      if (err) {
        req.flash("danger", JSON.stringify(err));
        return res.redirect('/admin/dependency/edit/' + dep._id);
      } else {
        req.flash("success", "Dependency type " + dep.name + " updated!");
        return res.redirect('/admin/dependency');
      }
    });
  });
});

router.post('/dependency/add', auth, function(req, res, next) {
    var dep = new Dependency({
        name: req.body.name
    }).save(function(err, result) {
        if (err) {
            req.flash("danger", JSON.stringify(err));
            return res.redirect('/admin/dependency/add');
        } else {
            req.flash("success", "Dependency Type added!");
            return res.redirect('/admin/dependency');
        }
    });
});

router.get('/dependencyVersion', auth, function(req, res, next) {
    Dependency.find()
        .then(function(result) {
            return res.render('admin/dependency/addVersion', { types : result });
        }, next);
});

router.post('/dependencyVersion', auth, function(req, res, next) {
    Dependency.findOne({_id: req.body.type})
        .then(function (dep) {
            new DependencyVersion({
                version: req.body.version,
                type: dep._id,
                color: req.body.color || randomColor()
            }).save(function (err, version) {
                if (err) {
                    req.flash("danger", JSON.stringify(err));
                    return res.redirect('/admin/dependencyVersion');
                } else {
                    req.flash("success", "Dependency Version added!");

                    dep.versions.push(version._id);
                    dep.save(function (err, saved) {
                        return res.redirect('/admin/dependencyVersion');
                    });
                }
            });
        }, next);
});

module.exports = router;
