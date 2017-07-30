//index.js/
var express = require('express'),
    exphbs = require('express-handlebars'),
    logger = require('morgan'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    methodOverride = require('method-override'),
    session = require('express-session'),
    passport = require('passport'),
    fs = require('fs'),
    LocalStrategy = require('passport-local'),
    TwitterStrategy = require('passport-twitter'),
    GoogleaStrategy = require('passport-google'),
    FacebookStrategy = require('passport-facebook'),
    favicon = require('serve-favicon'),
    path = require('path');

//We will be creating these two files shortly
var config = require('./config.js'), //config file contains all tokens and other private info
   funct = require('./functions.js'); //funct file contains our helper functions for our Passport and database work

var app = express();

//===============PASSPORT=================
// Use the LocalStrategy within Passport to login/"signin" users.
// Passport session setup.
passport.serializeUser(function(user, done) {
  console.log("serializing " + user.email);
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  console.log("deserializing " + obj);
  done(null, obj);
});

passport.use('local-signin', new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password',
  passReqToCallback : true}, //allows us to pass back the request to the callback
  function(req, email, password, done) {
    funct.localAuth(email, password)
    .then(function (user) {
      if (user) {
        console.log("LOGGED IN AS: " + user.email);
        req.session.success = 'You are successfully logged in ' + user.email + '!';
        done(null, user);
      }
      if (!user) {
        console.log("COULD NOT LOG IN");
        req.session.error = 'Could not log user in. Please try again.'; //inform user could not log them in
        done(null, user);
      }
    })
    .fail(function (err){
      console.log(err.body);
    });
  }
));
// Use the LocalStrategy within Passport to register/"signup" users.
passport.use('local-signup', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback : true
  }, //allows us to pass back the request to the callback
  function(req, email, password, done) {
    funct.localReg(email, password)
    .then(function (user) {
      if (user) {
        console.log("REGISTERED: " + user.email);
        req.session.success = 'You are successfully registered and logged in ' + user.email + '!';
        done(null, user);
      }
      if (!user) {
        console.log("COULD NOT REGISTER");
        req.session.error = 'That email is already in use, please try a different one.'; //inform user could not log them in
        done(null, user);
      }
    })
    .fail(function (err){
      console.log(err.body);
    });
  }
));

//===============EXPRESS================
// Configure Express
app.use(logger('combined'));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(methodOverride('X-HTTP-Method-Override'));
app.use(session({secret: 'supernova', saveUninitialized: true, resave: true}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(__dirname + '/views'));

// Session-persisted message middleware
app.use(function(req, res, next){
  var err = req.session.error,
      msg = req.session.notice,
      success = req.session.success;

  delete req.session.error;
  delete req.session.success;
  delete req.session.notice;

  if (err) res.locals.error = err;
  if (msg) res.locals.notice = msg;
  if (success) res.locals.success = success;

  next();
});

// Configure express to use handlebars templates
var hbs = exphbs.create({
    defaultLayout: 'main', //we will be creating this layout shortly
});
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

//===============ROUTES=================
//displays our homepage
app.get('/', function(req, res){
  if(req.user) {
    fs.readdir('views/articles', function (err,files) {
        var data = [];
        files.forEach( function(file) {
          // console.log(file);
          var regex = new RegExp(req.user.email+"\-(.+)\-(.+)\..*")
          var n = file.toString().match(regex);
          // console.log(regex,n);
          if (n != null) {
            data.push({'path':"article?path="+file,"title":n[2],'name':n[1]});
          }
        })

        var add = {
          'user': req.user,
          'data': data
        };

        console.log(add);
        res.render('home', add);
    })
  }
  else {
    res.render('home');
  }
});

//displays our signup page
app.get('/signin', function(req, res){
  res.render('signin');
});

//sends the request through our local signup strategy, and if successful takes user to homepage, otherwise returns then to signin page
app.post('/local-reg', passport.authenticate('local-signup', {
  successRedirect: '/',
  failureRedirect: '/signin'
  })
);

//sends the request through our local login/signin strategy, and if successful takes user to homepage, otherwise returns then to signin page
app.post('/login', passport.authenticate('local-signin', {
  successRedirect: '/',
  failureRedirect: '/signin'
  })
);

//logs user out of site, deleting them from the session, and returns to homepage
app.get('/logout', function(req, res){
  var name = req.user.email;
  console.log("LOGGING OUT " + req.user.email)
  req.logout();
  res.redirect('/');
  req.session.notice = "You have successfully been logged out " + name + "!";
});

app.get('/post', function(req,res){
  // if (req.isAuthenticated()) {
  res.render('post', {user: req.user});
  // }
  // req.session.error = 'Please sign in!';
  // res.redirect('/signin');

});

app.get('/article', function(req,res){

  var cont = fs.readFile("./views/articles/"+req.query.path, 'utf8', function(err,data){
    res.render('article', {user:req.user, content:data});
  })
  console.log("atricle",cont);

});

app.post('/post', function(req,res){
  // var ff = '<!-- views/article.handlebars --><!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="X-UA-Compatible" content="IE=edge"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="User Authentication"><meta name="author" content=""><title>'+req.body.title+'</title><link rel="stylesheet" href="//netdna.bootstrapcdn.com/bootstrap/3.1.1/css/bootstrap.min.css"><link rel="stylesheet" href="/css/layout.css" type="text/css"></head><body><div class="container"><div id="content"><h1 class="content-header">'+req.body.title+'</h1><p>'+req.body.message+'</p></div>{{#if user}}{{/if}}{{{body}}}</div><script src="https://ajax.googleapis.com/ajax/libs/jquery/1.11.0/jquery.min.js"></script><script src="//netdna.bootstrapcdn.com/bootstrap/3.1.1/js/bootstrap.min.js"></script></body></html>';

  fs.writeFile("views/articles/"+req.user.email.replace(/\s/g, "_").replace(/\./,"_")+"-"+req.body.name.replace(/\s/g, "_")+"-"+req.body.title.replace(/\s/g, "_")+".txt", req.body.message, function(err) {
    if(err) {
        return console.log(err);
    }
    else {
      console.log("The file was saved!");
      res.redirect('/');
      req.session.notice = "Article submitted successfully!";
    }
  });
});

fs.readdir('views/articles', function (err,files) {
    files.forEach( function(file) {
      var n = file.toString().match(/(.*)\.txt/);
      if (n != null) {
        console.log('setup', file)
        app.get('/articles/'+n[1], function (req,res) {
          res.send('/articles/'+n[1]);
        });
      }
    })
});

fs.readdir('views', function (err,files) {
    files.forEach( function(file) {
      var n = file.toString().match(/(.*)\.handlebars$/);
      if (n != null) {
        console.log('setup handlebars', file)
        app.get('/'+n[1], function (req,res) {
          res.render(n[1], {user:req.u});
        });
      }
    })
});

app.get('/css/layout.css', function(req,res){
  res.sendFile('/css/layout.css');
  res.end();
});

app.get('/avatars/finapple.jpg', function(req,res){
  res.sendFile('/avatars/fineapple.jpg');
});

app.get('favicon.ico', function(req,res){
  res.sendFile('favicon.ico');
});

fs.readdir('views', function (err,files) {
    files.forEach( function(file) {
      var n = file.toString().match(/(css$|js$|jpg$|png$|ico$)/);
      if (n != null) {
        console.log('setup', file)
        app.get('/'+n, function (req,res) {
          res.sendFile('/'+n);
        });
      }
    })
});
// app.get(/(?!\.handlebars)$/, function(req,res){
//   res.sendFile('/(?!\.handlebars)$/');
// });

// Simple route middleware to ensure user is authenticated.
// function ensureAuthenticated(req, res, next) {
//   if (req.isAuthenticated()) { return next(); }
//   req.session.error = 'Please sign in!';
//   res.redirect('/signin');
// }

//===============PORT=================
var port = process.env.PORT || 5000; //select your port or let it pull from your .env file
app.listen(port);
console.log("listening on " + port + "!");
