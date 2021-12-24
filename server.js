if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}

const express = require('express')
const app = express()
const bcrypt = require('bcrypt')
const passport = require('passport')
const flash = require('express-flash')
const session = require('express-session')
const methodOverride = require('method-override')

const db = require('./src/cloudant-interaction')

const initializePassport = require('./passport-config')
initializePassport(
  passport,
  async email => await db.findUserByEmail(email),
  async id => await db.findUserById(id)
)

app.set('view-engine', 'ejs')
app.use(express.urlencoded({ extended: false }))
app.use(express.json())
app.use(flash())
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride('_method'))

app.get('/', checkAuthenticated, async (req, res) => {
  let user = await req.user;
  res.render('index.ejs', { name: user[0].doc.name })
})

app.get('/login', checkNotAuthenticated, (req, res) => {
  res.render('login.ejs')
})

app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true
}))

app.get('/register', checkNotAuthenticated, (req, res) => {
  res.render('register.ejs')
})

app.post('/register', checkNotAuthenticated, async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10)

    //check

    db.createUser(req.body.name, req.body.email, hashedPassword)

    res.redirect('/login')
  } catch {
    res.redirect('/register')
  }
})

app.delete('/logout', (req, res) => {
  req.logOut()
  res.redirect('/login')
})

app.get('/season/:season-:nr', (req, res) => {
  //get season from db
  let season;

  res.render('season.ejs', season)
})

app.get('/create', checkAuthenticated, (req, res) => {
  //render season creation page
  res.render('create.ejs');
})

app.post('/create', async (req, res) => {
  //check if season exists
  let exists = await db.findSeasonByYearAndSeasonNr(req.body.year, req.body.season);
  exists = exists.length > 0;
  if (!exists) {
    //create new season
    try {
      db.createSeason(req.body.year, req.body.season, req.body.driverTeams, req.body.tracks);
      console.log('received new season');
      // console.log(req.body);  
      res.status(200).redirect('/');
    } catch (err) {
      res.status(400).send();
    }
  } else {
    //season does not exist
    res.status(400).send();
  }
})

app.get('/edit', checkAuthenticated, async (req, res) => {
  let list = await db.getAllSeasons();
  //get list of all seasons
  res.render('list.ejs', { list: list.result });
})

app.get('/edit/:year-:season', checkAuthenticated, async (req, res) => {
  let season = await db.findSeasonByYearAndSeasonNr(req.params.year, req.params.season);
  res.render('edit.ejs', { season: season[0].doc });
})

app.put('/edit/:year-:season', checkAuthenticated, async (req, res) => {
  //check if season exists
  let exists = await db.findSeasonByYearAndSeasonNr(req.params.year, req.params.season);
  exists = exists.length > 0;
  if (!exists) {
    //season does not exist
    res.status(400).send();
  } else {
    //update season in db
    db.updateSeason(req.params.year, req.params.season, req.body);
    res.status(200).send();
  }
})

app.get('/newResult', checkAuthenticated, async (req, res) => {
  let list = await db.getAllSeasons();
  //get list of all seasons
  res.render('resultSeasonList.ejs', { list: list.result });
})

app.get('/newResult/:year-:season', checkAuthenticated, async (req, res) => {
  //check if season exists
  let exists = await db.findSeasonByYearAndSeasonNr(req.params.year, req.params.season);
  existsbool = exists.length > 0;
  if (!existsbool) {
    //season does not exist
    res.status(400).redirect('/newResult');
  } else {
    res.status(200).render('resultRaceList.ejs', { season: exists[0].doc });
  }
})

app.get('/newResult/:year-:season/:race', checkAuthenticated, async (req, res) => {
  //check if season exists
  let exists = await db.findSeasonByYearAndSeasonNr(req.params.year, req.params.season);
  existsbool = exists.length > 0;
  console.log(exists)
  console.log(req.params.race)
  if (!existsbool) {
    //season does not exist
    res.status(400).redirect('/newResult');
  } else {
    if (exists[0].doc.tracks.includes(req.params.race)) {
      let season = {
        doc: exists[0].doc,
        track: req.params.race
      };
      res.status(200).render('newResult.ejs', { season: season});
    } else {
      res.status(400).redirect('/newResult');
    }
  }
})

function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next()
  }

  res.redirect('/login')
}

function checkNotAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect('/')
  }
  next()
}

app.listen(3000)