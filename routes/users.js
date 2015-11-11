var express = require('express');
var _ = require('underscore');
var router = express.Router();


function processReqUser ( req_user){  
  if (req_user) var temp_user = req_user.toObject();
  else return null;
  temp_user.display_name = req_user.displayName();
  delete temp_user.password_hash; 
  return temp_user;
}
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    next();
  } else {
    res.redirect("/users/signin?referral_url=" + req.originalUrl );
  }
}
make_passwd = function(n, a) {
  var index = (Math.random() * (a.length - 1)).toFixed(0);
  return n > 0 ? a[index] + make_passwd(n - 1, a) : '';
};

/* all the routes under "/users"*/
/* */
var passport = null;
router.all('*', function(req, res, next) {
  if (passport === null){
    passport = req.PASSPORT;
  }
  return next(); // following routes conninue handling requests
});



router.get('/signup', function (req, res, next){
  res.render("signup",{
    breadcrumTitle:"sign up",
    pathToHere:"users / signup"
  });
});

router.get('/signin', function(req,res,next){
  var referal_url = req.query.referral_url;
  res.render("users/signin.jade", {
    dev_mode: true
  });
});

router.post('/signup', function (req, res, next){
  /*db operation goes here*/
  var new_user = {};
  new_user.email = req.body.email;
  new_user.password_hash = req.body.password; 
  new_user.first_name = req.body.firstname;
  new_user.last_name = req.body.lastname;
  // new_user.receive_updates = req.body.receive_updates|| false;
  new_user.usercat = req.body.usercat;     // 1 is common user
  
  new_user = new req.DB_USER(new_user);
  new_user.save(function (error){
    if (error) return next(error);
    console.log("[user.js:34 ]");
    // res.json(new_user.email);   // TODO send email here
    return res.render("signup",{
      breadcrumTitle:"sign up",
      pathToHere:"users / signup",
      msg_type:"success",
      msg_content:"Hello, "+new_user.displayName()+", you've signed up successfully. Click \"SIGN IN\" at left upper corner to sign in"
    });
  });
});

router.get('/logout', function (req, res, next){
  req.logout();
  res.redirect("back");
})

router.get("/dashboard",ensureAuthenticated, function (req, res, next) {
  var temp_userid = req.user._id.toString();
  req.db_models.PolygonGeojson.find({"properties.owner": temp_userid}, null, {}, function exec (error, db_polygons){
    if (error)
      return next(error);
    res.render("users/dashboard.jade", {
      polygons:db_polygons,
      isAuthenticated: req.isAuthenticated(),
      user: processReqUser(req.user)
    });
  });
});


router.get("/account/:active_subsection", ensureAuthenticated, function (req, res, next){
  res.render("users/account.jade",{
    active_subsection:req.params.active_subsection,
    isAuthenticated: req.isAuthenticated(),
    user: processReqUser(req.user)
  });
})
// for  /users/signin
// router.post('/signin', passport.authenticate('local'),function (req, res, next){
//   console.log("[user.js 47]");
//   res.redirect('back'); 
// });

function accountRenderHelper(req, res, next, active_subsection, flash){
  res.render("users/account.jade", {
    active_subsection:active_subsection,
    isAuthenticated: req.isAuthenticated(),
    user:processReqUser(req.user),
    flash:flash
  });
  return;
}


router.post('/account/:active_subsection', ensureAuthenticated, function (req, res, next){
  if (req.params.active_subsection === "security"){
    if (req.user.password_hash !== req.body.old_password) {
      accountRenderHelper(req, res, next, "security",{ type:"danger", message:"old password does not match the data in data base." } )
      return;
    }
    req.user.password_hash = req.body.password_hash;
    req.user.save(function (err){
      if (err) return next(err);
      accountRenderHelper(req,res,next,"security",{ type:"success", message:"password changed successfully." } );
      return;
    });
  } else if (req.params.active_subsection === "basic_info"){
    _.each(_.keys(req.body), function (keyname, index, keys){
      if( typeof req.user[keyname] !== "undefined"){
        req.user[keyname] = req.body[keyname];
      }
    });
    req.user.save(function ( error){
      if (error) return next(error);
      accountRenderHelper(req,res,next,"basic_info",{ type:"success", message:"Basic info changed." });
      return;
    });
  } else if (req.params.active_subsection === "reset_password") {
    req.user.password_hash = make_passwd(13, 'qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM1234567890');
    req.user.save(function(err){
      if (err) return next(err);
      res.mailer.send('emails/email.jade', {to:req.user.email, subject:"[FASIDS] Your password has been reset", user:req.user}, function (err){
        if (err){
          console.log(err);
          res.status(500).send("Internal error cause email cannot be sent");
          return;
        }
        res.send("email sent");
      });
    });
  }
});

module.exports = router;
