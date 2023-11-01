import dotenv, { config } from "dotenv"
dotenv.config();
import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import session from "express-session";
import passport from "passport";
import passportLocalMongoose from "passport-local-mongoose";
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import FacebookStrategy from "passport-facebook";
import LineStrategy from "passport-line";
import findOrCreate from "mongoose-findorcreate";




const app = express();
const port = 3000;


//throw it to env file make it invisible
//npm i dotenv and place it on the top of program
// const KEY = "HelloWorld"

app.use(express.json());
app.use(bodyParser.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
//set up session config
app.use(session({
  secret: 'anything',
  resave: false,
  saveUninitialized: true
}));

//trggilge the app to implement passport
app.use(passport.initialize());
//ask passport to activate seesion
app.use(passport.session());



//"local DB connection"
mongoose.connect(process.env.DB_ADDRESS);

//create a schema for user
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  facebookId: String,
  id: String
});

const secretSchema = new mongoose.Schema({

    username: String,
    secret:String
})

userSchema.plugin(passportLocalMongoose, { usernameField: 'email' });
userSchema.plugin(findOrCreate);


//create the user collection
const Users = new mongoose.model("User", userSchema);

const Secrets = new mongoose.model("Secret", secretSchema);

passport.use(Users.createStrategy());

// passport.serializeUser(Users.serializeUser());
// passport.deserializeUser(Users.deserializeUser());
passport.serializeUser(function (user, cb) {
  process.nextTick(function () {
    console.log("ser:" + user)
    return cb(null, {
      id: user._id,
      username: user.username,
      picture: user.picture
    });
  });
});

passport.deserializeUser(function (user, cb) {

  process.nextTick(function () {

    return cb(null, user);
  });
});

passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/goolge/secret"
},
  function (accessToken, refreshToken, profile, cb) {
    Users.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
  clientID: process.env.APP_ID,
  clientSecret: process.env.APP_SECRET,
  callbackURL: "http://localhost:3000/auth/facebook/secret"
},
  function (accessToken, refreshToken, profile, cb) {
    Users.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new LineStrategy({
  channelID: process.env.LINE_CHANNEL_ID,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
  callbackURL: "http://localhost:3000/auth/line/secret"
},
  function (accessToken, refreshToken, profile, done) {
    Users.findOrCreate({ id: profile.id }, function (err, user) {
      return done(err, user);
    });
  }
));

//dir to home page (login page)
app.get("/", function (req, res) {


  if (req.isAuthenticated()) {

    res.redirect("/main");

  } else {

    res.render("home");
  }
});

//dir to regis page
app.get("/singup", function (req, res) {

  res.render("signup");

});



//dir to post page
app.get("/submit", function (req, res) {



  res.render("submit");
})


//dir to secret page
app.get("/main", async function (req, res) {



  const secret = await Secrets.find({})

  if(req.isAuthenticated()) {

    res.render("main", {

      secrets: secret

    })

  } else {


    res.redirect("/");

  }

  

});

//registeration fail -> username exiting
app.get("/userexit", function (req, res) {

  res.render("signupfail");
})

//login fail -> user does not exit
app.get("/unknownUser", function (req, res) {

  res.render("loginemailfail");
})

//login fail -> incorrect password
app.get("/wrongpassword", function (req, res) {

  res.render("loginpasswordfail")
})


app.get("/auth/goolge/secret", passport.authenticate('google', { failureRedirect: '/signup' }), function (req, res) {
  // Successful authentication, redirect home.
  res.redirect('/');
});



app.get('/auth/facebook/secret', passport.authenticate('facebook', { failureRedirect: '/signup' }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect('/');
  });


app.get('/auth/line/secret', passport.authenticate('line', { failureRedirect: '/signup', successRedirect: '/' }));




app.post("/register", async function (req, res) {



  const foundUser = await Users.findOne({ email: req.body.email });

  //if user name is in used
  if (foundUser) {

    console.log(foundUser);
    console.log("Registeration Fail: UserName exiting");
    res.redirect("/userexit");

  } else {


    Users.register({ email: req.body.email }, req.body.password, function (err, newUser) {

      if (err) {

        console.log(err);
        res.redirect("/singup");

      } else {

        //trigger the authentication sucess and store the cookie
        passport.authenticate("local")(req, res, function () {

          console.log("This is when create" + req.user);
          console.log("New User info has been added to DB")
          res.redirect("/");
        });

      }
    });
  }

});


//this is for log in
app.post("/login", async function (req, res, next) {

  const returnUser = new Users({

    email: req.body.email,
    password: req.body.password
  });

  //check if the user exiting
  const foundUser = await Users.findOne({ email: returnUser.email });


  if (!foundUser) {

    console.log("User Not Found!")
    res.redirect("/unknownUser")

  } else {

    passport.authenticate('local', function (err, user, info) {
      if (err) {
        return next(err); // Handle the error
      }
      if (!user) {
        // Handle the case where login fails (incorrect username or password)
        return res.redirect('/wrongpassword');
      }
      req.login(user, function (err) {
        if (err) {
          return next(err); // Handle the error
        }
        // Successfully logged in
        return res.redirect('/main');
      });
    })(req, res, next);
  }
})




app.post("/share", function (req, res) {

  if (req.isAuthenticated()) {

    res.redirect("/submit");

  } else {

    res.redirect('/');
  }
});




app.post("/logout", function (req, res) {

  req.logout(function (err) {

    if (err) { return next(err); }

    res.redirect('/');

  });


});



app.post("/auth/google", function (req, res, next) {

  passport.authenticate("google", { scope: ["profile"] })(req, res, next);
})

app.post("/auth/facbook", passport.authenticate('facebook'));


app.post("/auth/line", passport.authenticate('line'));


app.post("/submit", function (req, res) {


  const inputSecret = req.body.secret;

  console.log(`Inpute secret is: ${inputSecret}`);

  console.log(req.user)
 
  //store into SecretDB 

  

  const newSecret  = new Secrets ({


      username: req.user.id,
      secret: inputSecret

  });

  console.log("This is the Secret: " + newSecret);

  newSecret.save()

  .then(result => {

    console.log("New Secret has been Saved");

    res.redirect("/main");

  })

  .catch(err => {

    console.log(err);

    res.redirect("/")
  })

})


app.listen(process.env.PORT || port, function (err) {

  if (err) {
    console.log(err);
  } else {

    console.log(`sucessfully connected to ${port}`)
  }

});
