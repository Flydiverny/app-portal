var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();
var fs = require('fs');
var multer = require('multer');
const Application = mongoose.model('Application');
const auth = require('../../middleware/auth');
const storage = require('../../util/upload');

var upload = multer({ storage: storage });

router.get('/newApplication', auth, (req, res, next) => {
    return res.render('admin/newApplication');
});

router.post('/newApplication', auth, upload.single('icon'), (req, res, next) => {
    if (!req.file){
        req.flash("warning", "No valid file specified!");
        return res.redirect("/admin/newApplication");
    }

    if (req.body.key.indexOf(" ") > -1) {
        req.flash("danger", "Key must not contain any spaces");
        return res.redirect("/admin/newApplication");
    }

    var app = new Application({
        id: req.body.key,
        title: req.body.title,
        type: req.body.type,
        icon: req.file.path,
        link: req.body.link,
        hidden: req.body.hidden ? true : false
    }).save((err, result) => {
        if (err) {
            console.error(err);
            // TODO remove uploaded file here.
            req.flash("warning", "An error occured while saving! Error: " + JSON.stringify(err));
            return res.redirect("/admin/newApplication");
        }

        req.flash("success", "Application created!");
        return res.redirect('/admin')
    });
});

module.exports = router;