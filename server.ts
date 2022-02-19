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
const expressLayouts = require('express-ejs-layouts');

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
    getAllSeasonsForYear,
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
}

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

app.get('/login', checkNotAuthenticated, (req: any, res: { set: (arg0: { "Access-Control-Allow-Origin": string; "Access-Control-Allow-Headers": string; "Access-Control-Allow-Methods": string; "Content-Security-Policy": string; "X-Content-Security-Policy": string; "X-WebKit-CSP": string; }) => void; render: (arg0: string) => void; }) => {
    res.set(header);
    res.render('auth/login.ejs')
})

app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
    successRedirect: '/admin',
    failureRedirect: '/login',
    failureFlash: true
}))

app.get('/register', checkNotAuthenticated, (req: any, res: { set: (arg0: { "Access-Control-Allow-Origin": string; "Access-Control-Allow-Headers": string; "Access-Control-Allow-Methods": string; "Content-Security-Policy": string; "X-Content-Security-Policy": string; "X-WebKit-CSP": string; }) => void; render: (arg0: string) => void; }) => {
    res.set(header);
    res.render('auth/register.ejs')
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
})

app.delete('/logout', (req: { logOut: () => void; }, res: { redirect: (arg0: string) => void; }) => {
    req.logOut()
    res.redirect('/')
})

// ------------------------------------------------------------
// Main page and admin interface
// ------------------------------------------------------------

/* app.get('/', async (req: any, res: { set: (arg0: { "Access-Control-Allow-Origin": string; "Access-Control-Allow-Headers": string; "Access-Control-Allow-Methods": string; "Content-Security-Policy": string; "X-Content-Security-Policy": string; "X-WebKit-CSP": string; }) => void; render: (arg0: string, arg1: { list: any; }) => void; }) => {
    let list = await db.getAllSeasons();
    //get list of all seasons
    res.set(header);
    res.render('public/index.ejs', { list: list.result });
})

app.get('/admin', checkAuthenticated, async (req, res) => {
    let user = await req.user;
    res.set(header);
    res.render('admin/admin.ejs', { name: user[0].doc.name })
}) */

// ------------------------------------------------------------
// Admin functions
// ------------------------------------------------------------

// ------------------------------------------------------------
// public Result display
// ------------------------------------------------------------

/* 
app.get('/create', checkAuthenticated, (req: any, res: { set: (arg0: { "Access-Control-Allow-Origin": string; "Access-Control-Allow-Headers": string; "Access-Control-Allow-Methods": string; "Content-Security-Policy": string; "X-Content-Security-Policy": string; "X-WebKit-CSP": string; }) => void; render: (arg0: string) => void; }) => {
    //render season creation page
    res.set(header);
    res.render('admin/season/create.ejs');
})

app.post('/create', checkAuthenticated, async (req: { body: { year: any; season: any; driverTeams: any; tracks: any; }; }, res: { status: (arg0: number) => { (): any; new(): any; redirect: { (arg0: string): void; new(): any; }; send: { (): void; new(): any; }; }; }) => {
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

app.get('/edit', checkAuthenticated, async (req: any, res: { set: (arg0: { "Access-Control-Allow-Origin": string; "Access-Control-Allow-Headers": string; "Access-Control-Allow-Methods": string; "Content-Security-Policy": string; "X-Content-Security-Policy": string; "X-WebKit-CSP": string; }) => void; render: (arg0: string, arg1: { list: any; }) => void; }) => {
    let list = await db.getAllSeasons();
    //get list of all seasons
    res.set(header);
    res.render('admin/season/list.ejs', { list: list.result });
})

app.get('/edit/:year-:season', checkAuthenticated, async (req: { params: { year: any; season: any; }; }, res: { set: (arg0: { "Access-Control-Allow-Origin": string; "Access-Control-Allow-Headers": string; "Access-Control-Allow-Methods": string; "Content-Security-Policy": string; "X-Content-Security-Policy": string; "X-WebKit-CSP": string; }) => void; render: (arg0: string, arg1: { season: any; }) => void; }) => {
    let season = await db.findSeasonByYearAndSeasonNr(req.params.year, req.params.season);
    res.set(header);
    res.render('admin/season/edit.ejs', { season: season[0].doc });
})

app.put('/edit/:year-:season', checkAuthenticated, async (req: { params: { year: any; season: any; }; body: any; }, res: { status: (arg0: number) => { (): any; new(): any; send: { (): void; new(): any; }; }; }) => {
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

app.get('/newResult', checkAuthenticated, async (req: any, res: { set: (arg0: { "Access-Control-Allow-Origin": string; "Access-Control-Allow-Headers": string; "Access-Control-Allow-Methods": string; "Content-Security-Policy": string; "X-Content-Security-Policy": string; "X-WebKit-CSP": string; }) => void; render: (arg0: string, arg1: { list: any; }) => void; }) => {
    let list = await db.getAllSeasons();
    //get list of all seasons
    res.set(header);
    res.render('admin/results/resultSeasonList.ejs', { list: list.result });
})

app.get('/newResult/:year-:season', checkAuthenticated, async (req: { params: { year: any; season: any; }; }, res: { status: (arg0: number) => { (): any; new(): any; redirect: { (arg0: string): void; new(): any; }; render: { (arg0: string, arg1: { season: any; }): void; new(): any; }; }; set: (arg0: { "Access-Control-Allow-Origin": string; "Access-Control-Allow-Headers": string; "Access-Control-Allow-Methods": string; "Content-Security-Policy": string; "X-Content-Security-Policy": string; "X-WebKit-CSP": string; }) => void; }) => {
    //check if season exists
    let exists = await db.findSeasonByYearAndSeasonNr(req.params.year, req.params.season);
    const existsbool = exists.length > 0;
    if (!existsbool) {
        //season does not exist
        res.status(400).redirect('/newResult');
    } else {
        res.set(header);
        res.status(200).render('admin/results/resultRaceList.ejs', { season: exists[0].doc });
    }
})

app.get('/newResult/:year-:season/:race', checkAuthenticated, async (req: { params: { year: any; season: any; race: any; }; }, res: { status: (arg0: number) => { (): any; new(): any; redirect: { (arg0: string): void; new(): any; }; render: { (arg0: string, arg1: { season: { doc: any; track: any; }; }): void; new(): any; }; }; set: (arg0: { "Access-Control-Allow-Origin": string; "Access-Control-Allow-Headers": string; "Access-Control-Allow-Methods": string; "Content-Security-Policy": string; "X-Content-Security-Policy": string; "X-WebKit-CSP": string; }) => void; }) => {
    //check if season exists
    let exists = await db.findSeasonByYearAndSeasonNr(req.params.year, req.params.season);
    const existsbool = exists.length > 0;
    if (!existsbool) {
        //season does not exist
        res.status(400).redirect('/newResult');
    } else {
        if (exists[0].doc.tracks.includes(req.params.race)) {
            let season = {
                doc: exists[0].doc,
                track: req.params.race
            };
            res.set(header);
            res.status(200).render('admin/results/newResult.ejs', { season: season });
        } else {
            res.status(400).redirect('/newResult');
        }
    }
})

app.post('/newResult/:year-:season/:race', checkAuthenticated, async (req: { params: { year: any; season: any; race: any; }; body: any; }, res: { status: (arg0: number) => { (): any; new(): any; send: { (): void; new(): any; }; }; set: (arg0: { "Access-Control-Allow-Origin": string; "Access-Control-Allow-Headers": string; "Access-Control-Allow-Methods": string; "Content-Security-Policy": string; "X-Content-Security-Policy": string; "X-WebKit-CSP": string; }) => void; }) => {
    let exists = await db.findSeasonByYearAndSeasonNr(req.params.year, req.params.season);
    const existsbool = exists.length > 0;
    if (!existsbool) {
        res.status(400).send();
    } else {
        //check if race exists in season
        if (exists[0].doc.tracks.includes(req.params.race)) {
            if (db.addRaceResultToSeason(req.params.year, req.params.season, req.params.race, req.body) == null) {
                res.status(400).send();
            } else {
                res.set(header);
                res.status(200).send();
            }
        } else {
            res.status(400).send();
        }
    }
})

app.get('/editResult', checkAuthenticated, async (req: any, res: { set: (arg0: { "Access-Control-Allow-Origin": string; "Access-Control-Allow-Headers": string; "Access-Control-Allow-Methods": string; "Content-Security-Policy": string; "X-Content-Security-Policy": string; "X-WebKit-CSP": string; }) => void; render: (arg0: string, arg1: { list: any; }) => void; }) => {
    let list = await db.getAllSeasons();
    //get list of all seasons
    res.set(header);
    res.render('admin/editResult/editResultSeasonList.ejs', { list: list.result });
})

app.get('/editResult/:year-:season', checkAuthenticated, async (req: { params: { year: any; season: any; }; }, res: { status: (arg0: number) => { (): any; new(): any; redirect: { (arg0: string): void; new(): any; }; render: { (arg0: string, arg1: { season: any; }): void; new(): any; }; }; set: (arg0: { "Access-Control-Allow-Origin": string; "Access-Control-Allow-Headers": string; "Access-Control-Allow-Methods": string; "Content-Security-Policy": string; "X-Content-Security-Policy": string; "X-WebKit-CSP": string; }) => void; }) => {
    //check if season exists
    let exists = await db.findSeasonByYearAndSeasonNr(req.params.year, req.params.season);
    const existsbool = exists.length > 0;
    if (!existsbool) {
        //season does not exist
        res.status(400).redirect('/editResult');
    } else {
        res.set(header);
        res.status(200).render('admin/editResult/editResultRaceList.ejs', { season: exists[0].doc });
    }
})

app.get('/editResult/:year-:season/:race', checkAuthenticated, async (req: { params: { year: any; season: any; race: string | number; }; }, res: { status: (arg0: number) => { (): any; new(): any; redirect: { (arg0: string): void; new(): any; }; render: { (arg0: string, arg1: { season: any; race: any; }): void; new(): any; }; }; set: (arg0: { "Access-Control-Allow-Origin": string; "Access-Control-Allow-Headers": string; "Access-Control-Allow-Methods": string; "Content-Security-Policy": string; "X-Content-Security-Policy": string; "X-WebKit-CSP": string; }) => void; }) => {
    //check if season exists
    let exists = await db.findSeasonByYearAndSeasonNr(req.params.year, req.params.season);
    const existsbool = exists.length > 0;
    if (!existsbool) {
        //season does not exist
        res.status(400).redirect('/editResult');
    } else {
        //check if race exists in season and race is not empty
        if (exists[0].doc.tracks.includes(req.params.race) && exists[0].doc.results[req.params.race].fastestLap != "") {
            res.set(header);
            res.status(200).render('admin/editResult/editResult.ejs', { season: exists[0].doc, race: req.params.race })
        } else {
            res.status(400).redirect(`/editResult/${req.params.year}-${req.params.season}`);
        }
    }
})

app.post('/editResult/:year-:season/:race', checkAuthenticated, async (req: { params: { year: any; season: any; race: any; }; body: any; }, res: { status: (arg0: number) => { (): any; new(): any; send: { (): void; new(): any; }; }; }) => {
    let exists = await db.findSeasonByYearAndSeasonNr(req.params.year, req.params.season);
    const existsbool = exists.length > 0;
    if (!existsbool) {
        res.status(400).send();
    } else {
        //check if race exists in season
        if (exists[0].doc.tracks.includes(req.params.race)) {
            //update race in season
            if (db.updateRaceResultInSeason(req.params.year, req.params.season, req.params.race, req.body) == null) {
                res.status(400).send();
            } else {
                res.status(200).send();
            }
        }
    }
})

app.get('/result/:year-:season', async (req: { params: { year: any; season: any; }; }, res: { status: (arg0: number) => { (): any; new(): any; redirect: { (arg0: string): void; new(): any; }; render: { (arg0: string, arg1: { season: any; }): void; new(): any; }; }; set: (arg0: { "Access-Control-Allow-Origin": string; "Access-Control-Allow-Headers": string; "Access-Control-Allow-Methods": string; "Content-Security-Policy": string; "X-Content-Security-Policy": string; "X-WebKit-CSP": string; }) => void; }) => {
    //check if season exists
    let exists = await db.findSeasonByYearAndSeasonNr(req.params.year, req.params.season);
    const existsbool = exists.length > 0;
    if (!existsbool) {
        //season does not exist
        res.status(400).redirect('/');
    } else {
        res.set(header);
        res.status(200).render('public/result.ejs', { season: exists[0].doc });
    }
});

app.get('/result/', (req: any, res: { redirect: (arg0: string) => void; }) => {
    res.redirect('/');
}) 
*/

// ------------------------------------------------------------
// Data privacy statement required by german law
// ------------------------------------------------------------
app.get('/datenschutz', (req, res) => {
    res.status(200).render('public/datenschutz.ejs', { title: 'Datenschutz' });
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