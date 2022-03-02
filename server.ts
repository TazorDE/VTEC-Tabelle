if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}

import fs from 'fs';
import https from 'https';
import http from 'http';


import express from 'express';
const app = express()
import bcrypt from 'bcrypt';
import passport from 'passport';
import flash from 'express-flash';
import session from 'express-session';
import methodOverride from 'method-override';
import helmet from 'helmet';
import favicon from 'serve-favicon';
import path from 'path';
import expressLayouts from 'express-ejs-layouts';

import {
    createUser,
    findUserById,
    findUserByEmail,
    createDriver,
    findDriverById,
    getAllDrivers,
    updateDriver,
    createEvent,
    findEventById,
    getAllEvents,
    updateEvent,
    createSeason,
    getAllSeasons,
    getSeasonByYearAndSeason,
    checkSeasonExists,
    addResultToSeason,
    updateSeason
} from './src/ts/cloudant-interaction';

// required http headers
const header = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Content-Security-Policy": "default-src * 'self' 'unsafe-inline' 'unsafe-eval'; script-src * 'self' 'unsafe-inline' 'unsafe-eval' localhost:*/*; img-src * 'self' http://localhost/ https://*.malteteichert.de https://definitelynotascam.de blob: data:;",
    "X-Content-Security-Policy": "default-src * 'self' 'unsafe-inline' 'unsafe-eval'; script-src * 'self' 'unsafe-inline' 'unsafe-eval' localhost:*/*; img-src * 'self' http://localhost/ https://*.malteteichert.de https://definitelynotascam.de blob: data:; ",
    "X-WebKit-CSP": "default-src * 'self' 'unsafe-inline' 'unsafe-eval'; script-src * 'self' 'unsafe-inline' 'unsafe-eval' localhost:*/*; img-src * 'self' http://localhost/ https://*.malteteichert.de https://definitelynotascam.de blob: data:;"
};

// initialize passport for authentication
import initializePassport from './passport-config';
initializePassport(
    passport,
    async (email: any) => await findUserByEmail(email),
    async (id: any) => await findUserById(id)
)

// set up express server with middleware
app.set('view engine', 'ejs')
app.use(expressLayouts)
app.use(express.urlencoded({ extended: false }))
app.use(express.json())
app.use(flash())
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride('_method'))
app.use(helmet())
app.use(favicon(path.join(__dirname, 'public', 'images', 'favicon.ico')))
app.use(express.static(path.join(__dirname, 'public')))

// ------------------------------------------------------------
// user authentication
// ------------------------------------------------------------

app.get('/login', checkNotAuthenticated, (req: any, res: { set: (arg0: { "Access-Control-Allow-Origin": string; "Access-Control-Allow-Headers": string; "Access-Control-Allow-Methods": string; "Content-Security-Policy": string; "X-Content-Security-Policy": string; "X-WebKit-CSP": string; }) => void; render: (arg0: string, arg1: { title: string }) => void; }) => {
    const locals: { title: string, user: any } = {
        title: 'Login',
        user: false
    }
    res.set(header);
    res.render('auth/login', locals);
})

app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
    successRedirect: '/admin',
    failureRedirect: '/login',
    failureFlash: true
}));

app.get('/register', checkNotAuthenticated, (req: any, res: { set: (arg0: { "Access-Control-Allow-Origin": string; "Access-Control-Allow-Headers": string; "Access-Control-Allow-Methods": string; "Content-Security-Policy": string; "X-Content-Security-Policy": string; "X-WebKit-CSP": string; }) => void; render: (arg0: string, arg1: { title: string }) => void; }) => {
    const locals: { title: string, user: any } = {
        title: 'Register',
        user: false
    }
    res.set(header);
    res.render('auth/register.ejs', locals);
})

app.post('/register', checkNotAuthenticated, async (req: { body: { password: any; name: any; email: any; }; }, res: { redirect: (arg0: string) => void; }) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10)
        //check
        createUser(req.body.name, req.body.email, hashedPassword)
        res.redirect('/login')
    } catch {
        res.redirect('/register')
    }
});

app.delete('/logout', (req: { logOut: () => void; }, res: { redirect: (arg0: string) => void; }) => {
    req.logOut()
    res.redirect('/')
});

// ------------------------------------------------------------
// Main page and admin interface
// ------------------------------------------------------------

app.get('/admin', checkAuthenticated, async (req: any, res: { set: (arg0: { "Access-Control-Allow-Origin": string; "Access-Control-Allow-Headers": string; "Access-Control-Allow-Methods": string; "Content-Security-Policy": string; "X-Content-Security-Policy": string; "X-WebKit-CSP": string; }) => void; render: (arg0: string, arg1: { title: string; }) => void; }) => {
    const locals: { title: string; user: boolean } = {
        title: 'Admin',
        user: true
    };
    res.set(header);
    res.render('admin/index.ejs', locals);
});

app.get('/', async (req: any, res: { set: (arg0: { "Access-Control-Allow-Origin": string; "Access-Control-Allow-Headers": string; "Access-Control-Allow-Methods": string; "Content-Security-Policy": string; "X-Content-Security-Policy": string; "X-WebKit-CSP": string; }) => void; render: (arg0: string, arg1: { title: string; data: any; }) => void; }) => {
    const locals = {
        title: 'VTEC-League',
        data: await getAllSeasons(),
        user: false
    };
    res.set(header);
    res.render('public/index.ejs', locals);
});

// ------------------------------------------------------------
// Admin functions
// ------------------------------------------------------------

// catch all for admin routes
app.get('/create', checkAuthenticated, (req, res) => {
    res.redirect('/admin')
});

// seasons
app.get('/create/season', checkAuthenticated, (req, res) => {
    res.send('create season')
});

app.get('/edit/season', checkAuthenticated, (req, res) => {
    res.send('edit season')
});

// results
app.get('/create/results', checkAuthenticated, (req, res) => {
    res.send('create results')
});

app.get('/edit/results', checkAuthenticated, (req, res) => {
    res.send('edit results')
});

// drivers
app.get('/create/drivers', checkAuthenticated, (req, res) => {
    res.send('create drivers')
});

app.get('/edit/drivers', checkAuthenticated, (req, res) => {
    res.send('edit drivers')
});

// events
app.get('/create/events', checkAuthenticated, (req, res) => {
    res.send('create events')
});

app.get('/edit/events', checkAuthenticated, (req, res) => {
    res.send('edit events')
});

// ------------------------------------------------------------
// public Result display
// ------------------------------------------------------------

// result page
app.get('/result/:year-:season', async (req, res) => {
    let data = await getSeasonByYearAndSeason(req.params.year, req.params.season);
    res.send('result page')
});

// driver stats
app.get('/stats', async (req, res) => {
    res.send('driver stats')
});

app.get('/stats/:id', async (req, res) => {
    res.send('driver stats individual page')
});

// ical-link
app.get('/season/calendar/:year-:season/vtec-league.ical', async (req, res) => {
    res.send('ical-link')
});

// ------------------------------------------------------------
// Data privacy statement required by german law
// ------------------------------------------------------------
app.get('/datenschutz', (req: any, res) => {
    let user = req.session.passport.user | 0;
    let locals = {
        title: 'Datenschutz',
        user
    }
    res.status(200).render('public/datenschutz.ejs', locals);
})

// ------------------------------------------------------------
// login middleware
// ------------------------------------------------------------
function checkAuthenticated(req: { isAuthenticated: () => any; }, res: { redirect: (arg0: string) => void; }, next: () => any) {
    if (req.isAuthenticated()) {
        return next()
    }

    res.redirect('/login')
}
function checkNotAuthenticated(req: { isAuthenticated: () => any; }, res: { redirect: (arg0: string) => any; }, next: () => void) {
    if (req.isAuthenticated()) {
        return res.redirect('/admin')
    }
    next()
}

// ------------------------------------------------------------
// Start server
// ------------------------------------------------------------

// create base http server 
http.createServer(app).listen(80);

try {
    let credentials: { key: string, cert: string, dhparam: string, ca: string };
    // load TLS certificates for https and start https server
    credentials = {
        key: fs.readFileSync('/etc/letsencrypt/live/nsa.vtec.malteteichert.de/privkey.pem', 'utf8'),
        cert: fs.readFileSync('/etc/letsencrypt/live/nsa.vtec.malteteichert.de/fullchain.pem', 'utf8'),
        dhparam: fs.readFileSync('/var/www/example/sslcert/dh-strong.pem', 'utf8'),
        ca: fs.readFileSync('/etc/letsencrypt/live/nsa.vtec.malteteichert.de/chain.pem', 'utf8')
    };
    https.createServer(credentials, app).listen(443);
    console.info('HTTPS server started on port 443');
    console.info('Server is accessible on port 80');
} catch (error) {
    console.error(error);
    console.info('Fallback HTTP server started on port 80');
}

