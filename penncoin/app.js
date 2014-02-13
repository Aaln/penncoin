/**
    * Copyright (c) 2014 PennCoin
    * This code is the property of Gary Le and Aaron Landy and can not be copied
    * or redistributed without permission.
    *
    * Author(s):
    * -------
    *	Aaron Landy (aaron@thecompassmag.com)
    * 
    *
*/

var express = require('express');
var connect = require('connect');
var http = require('http');
var path = require('path');
var crypto = require('crypto');

var mongoose = require('mongoose');

var io = require('socket.io');

var app = express();
var server = http.createServer(app);

//render html files instead of ejs files.
app.engine('html', require('ejs').renderFile);

var portNumber = 5000;
var port = process.env.PORT || portNumber;
app.configure(function(){
  app.set('port', port);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'html');
  app.set('view options', {layout: false});
  app.use(connect.cookieParser('cookieKey81472321530089'));
  app.use(connect.session({
    secret: 'sessionSecretKey1238147530089',
    cookie: {maxAge : 7200000} // Expiers in 2 hours
    }));
  app.use(express.bodyParser());
  app.use(express.favicon()); 
  app.use(express.methodOverride());


app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.use(function(req, res, next){
  // the status option, or res.statusCode = 404
  // are equivalent, however with the option we
  // get the "status" local available as well
  res.render('404', { status: 404, url: req.url });

});

app.use(function(req, res, next){
    res.render('500', {
      status: err.status || 500
    , error: err
  });

});

app.configure('development', function(){
  app.use(express.errorHandler());
});

/********************* MONGOOSE INIT ****************************/

var mongoose = require('mongoose');

// DB connection 
// Collection: Users
// username: aaron 
// password: abc123

// For testing locally:
// mongoose.connect('mongodb://localhost/penncoin');

// For testing production:
mongoose.connect('mongodb://aaron:abc123@troup.mongohq.com:10061/penncoin');


var db = mongoose.connection;

// Error handling
db.on('error', console.error.bind(console, 'connection error:'));

db.once('open', function callback() {
  console.log('Connected to DB');
});

// User collection init
// deliveries stores all delivery ids a user undertakes

var User = mongoose.model('User', { 
  _id: String,
  firstName: String,
  lastName: String,
  email: String,
  address: String,
  cellNumber: String,
  password: String,
});


/********************* Password and ID encryption ****************************/

var algorithm = 'aes256';

/************************************************
*************************************************
************** THIS MUST NEVER CHANGE ***********/

// Password cipher
// If this is lost current passwords won't be able to be encrypted/decrypted.
var cipherKey = 'm3g54mhl5hnn12';

/************************************************/

var encrypt = function(text, callback) {
  var cipher = crypto.createCipher(algorithm, cipherKey);
  var encrypted = cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
  callback(encrypted);
}

var decrypt = function(encryptedText, callback) {
  var decipher = crypto.createDecipher(algorithm, cipherKey);
  var decrypted = decipher.update(encryptedText, 'hex', 'utf8') + decipher.final('utf8');
  callback(decrypted);
  
}


function randomString(length) {
    var chars = '0123456789'.split('');

    if (! length) {
        length = Math.floor(Math.random() * chars.length);
    }

    var str = '';
    for (var i = 0; i < length; i++) {
        str += chars[Math.floor(Math.random() * chars.length)];
    }
    return str;
}



app.get('/', function(req, res) {
  if(!req.session.userId) {
    res.render('home', {
      error : ''
    });
  }
  else {
    User.findOne({'_id' : req.session.userId}, function(err, userObj) {
      res.redirect('/main');
    });
  }
});

app.get('/login', function(req, res) {
  res.render('login', {
    error : ''
  });
});
app.post('/login', function(req, res) {
  if(!req.session.userId) {
    var email = req.body.email;
    console.log('email : ' + email);
    var password = req.body.password;

    // If both fields have lengths greater than 0
    if(email.length > 0 && password.length > 0) {
      try {
        // Encrypt password
        encrypt(password, function(encryptedPassword) {
          console.log('encryptedPassword : ' + encryptedPassword);
            User.findOne({'email' : email}, function(err, userObj) {
              console.log('userObj : ' + userObj);
              if(userObj === null) {
                res.render('login', {
                  error: 'Sorry, your email was not found.',
                });
              }
              else {
                if(userObj.password === encryptedPassword) {
                  res.redirect('/main');
                }
                else {
                  res.render('login', {
                    error: 'Sorry, your email or password was incorrect.',
                  });
                }

              }
            });
      });
    }
    catch(err) {
      console.log(err);
      res.render('home', {
        loginError: 'Sorry, there was an error processing your request, please try again.',
        signupError : '',
        error : ''
      });
    }

  }

    else {
      res.render('home', {
        loginError: 'All fields must be complete.',
        signupError : '',
        error : ''
      });
    }

  }

  else {
    redirect('/main');
  }

});

app.get('/signup', function(req, res) {
  res.render('signup', {
    error : ''
  });
});

app.post('/signup', function(req, res) {
  if(!req.session.userId) {
    var _id = randomString(8);
    var firstName = req.body.firstName;
    var lastName = req.body.lastName;
    var email = req.body.email;
    var password = req.body.password;
    if(firstName.length > 0 && lastName.length > 0 && email.length > 0 && password.length > 0) {
      User.findOne({'email' : email}, function(err, obj) {
        if(obj === null) {
            encrypt(password, function(encryptedPassword) {
            var user = new User({
              _id : _id,
              firstName : firstName,
              lastName : lastName,
              email : email,
              password : encryptedPassword
            });
          
            user.save(function(err) {
              if(err) {
                console.log(err);
                res.render('signup', {
                  error : 'Sorry, there was an error handling your request, please try again.'
                });

              }
              else {
                console.log('Saved user succesfully to db.');
                res.redirect('/main')

              }
            });
          });

        }
      });

      

    }
  }

  else {
    
  }
});

app.get('/main', function(req, res) {
  if(!req.session.userId) {
    res.redirect('/login')
  }

  else {
    startConnection(req.session.userId);
    User.findOne({'_id' : req.session.userId}, function(err, userObj) {
      if(err) {

      }
      else {
        if(userObj === null) {
          res.redirect('/login');

        }
        else {
          res.render('main', {
            userObj : userObj
          });
        }
      }
    });
  }
});

app.get('/user/:id', function(req, res) {
  if(!req.session.userId) {
    res.redirect('/login');

  }
  else if( req.params.id === req.session.userId ){
    User.findOne({_id : req.session.userId}, function(err, userObj) {
      if(err) {

      }
      else if(userObj === null) {
        res.redirect('/login');
      }
      else {
        res.render('profile', {
          userObj : userObj
        });
      }
    });
  }
  else {
    res.redirect('/main');
  }
  
});
app.get('/logout', function(req, res) {
  req.session.userId = null;
  res.redirect('/');
});


// Start the server.
server.listen(port, function(req, res) {
    console.log('listening on port ' + portNumber);
});