const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const morgan = require('morgan');
const session = require('express-session');
const path = require('path')

const authController = require('./controllers/auth.js');
const userHomeController = require('./controllers/userHome.js')
const isSignedIn = require("./middleware/signed-in.js");
const passUserToView = require("./middleware/pass-user-to-view.js");

const port = process.env.PORT ? process.env.PORT : '3000';

mongoose.connect(process.env.MONGODB_URI);

mongoose.connection.on('connected', () => {
  console.log(`Connected to MongoDB ${mongoose.connection.name}.`);
});

app.set('view engine', 'ejs')
app.set('views',path.join(__dirname,'views'))
app.use(express.static(path.join(__dirname,'public')))

app.use(express.urlencoded({ extended: false }));
app.use(methodOverride('_method'));
app.use(morgan('dev'));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

app.use(passUserToView);
app.use('/user', userHomeController)

app.get('/', (req, res) => {
  if(req.session.user){
    res.redirect('views/user/homepage')
  } else {
  res.render('index',)}
});

app.use('/auth', authController);
app.use(isSignedIn);

app.listen(port, () => {
  console.log(`The express app is ready on port ${port}!`);
});
