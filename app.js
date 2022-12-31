//jshint esversion:6
require('dotenv').config();
const express=require('express')
const bodyparser=require('body-parser')
const ejs=require('ejs')
const mongoose =require('mongoose');
const session=require('express-session')
const passport=require('passport')
const passportLocalmongoose=require('passport-local-mongoose');
var GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate=require('mongoose-findorcreate')

// e10adc3949ba59abbe56e057f20f883e

const app=express()




app.use(express.static("public"));
app.set('view engine','ejs')
app.use(bodyparser.urlencoded({ extended:true}))

app.use(session({
    secret:"our little secret.",
    resave:false,
    saveUninitialized:false
}));

app.use(passport.initialize());
app.use(passport.session());


const mongoDB="mongodb://127.0.0.1/userDB";

mongoose.connect(mongoDB,(err)=>{
    if(err) console.log('Unable to connect to the server: ${err}');
    else
    console.log("MongoDB is connected");
})
mongoose.set('strictQuery', true);

const userSchema=new mongoose.Schema({
    email:String,
    password:String,
    googleId:String,
    secret:String
});

userSchema.plugin(passportLocalmongoose);
userSchema.plugin(findOrCreate);

const User=new mongoose.model("User",userSchema);

passport.use(User.createStrategy());

/////
passport.serializeUser(function(user, done){

    done(null, user.id);
  
  });
passport.deserializeUser(function(id, done){
  
    User.findById(id, function(err, user){
  
      done(err, user);
  
    });
  
  });


passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get("/",function(req,res){
    res.render("home");
})

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] })
  );

  app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });


app.get("/register",function(req,res){
    res.render("register");
})
app.get("/login",function(req,res){
    res.render("login");
})


app.get("/secrets",function(req,res){
    User.find({"secret":{$ne:null}},function(err,foundUsers){
        if(err) console.log(err);
        else{
            if(foundUsers){
                res.render("secrets",{usersWithSecrets:foundUsers});
            }
        }
    });
});

app.get("/submit",function(req,res){
    if(req.isAuthenticated()){
        res.render("submit");
  }else{
      res.redirect("/login");
  }
});

app.post("/submit",function(req,res){
    const submittedSecret=req.body.secret
    console.log(req.user)
    User.findById(req.user.id,function(err,foundUser){
        if(err) console.log(err)
        else{
            if(foundUser) foundUser.secret=submittedSecret
            foundUser.save(function(){
                res.redirect("/secrets");
            });
        }
    })
});

app.get("/logout",function(req,res,next){
    req.logout(function(err){
        if(err) {return next(err);}
    
    res.redirect("/");
});
});

app.post("/register",function(req,res){
   
    User.register({username:req.body.username},req.body.password,function(err,user){
        if(err){
            console.log(err);
            res.redirect("/register")
        }else{
            passport.authenticate("local")(req,res,function(){
               res.redirect("/secrets");
            });
        }
    })
    
})
// $2b$10$zuTTJXf9J7fgePLNrlfJ5ujG3b/o6Mfq0qTgUDiaOsbNFg8aqSk.W
app.post("/login",function(req,res){
 const user=new User({
    username:req.body.username,
    password:req.body.password
 });
     req.login(user,function(err){
        if(err) console.log(err);
        else{
            passport.authenticate("local")(req,res,function(){
               res.redirect("/secrets");
            });
        }
     })
        
    
});














app.listen(3000,function(){
    console.log("Server is listening on port 3000")
})
