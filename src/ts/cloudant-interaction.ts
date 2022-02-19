import { CloudantV1 } from '@ibm-cloud/cloudant';
require('dotenv').config();
import Uuid from 'uuid';
import countryList from 'country-list';

const userdb: string = "vtec-users"
const driverdb: string = "vtec-drivers"
const eventdb: string = "vtec-events"
const seasondb: string = "vtec-seasons"

const client = CloudantV1.newInstance({});

// -----------------------------------------------------------
// Type definitions
// -----------------------------------------------------------

type raceResult = {
    drivers: any[];
    raceFinishOrder: string[];
    fastestLap: string;
    fastestLapTime: number;
    raceDNF: string[];
    raceDQ: string[];
    qualiFinishOrder?: string[];
    qualiFastestTime?: number;
    qualiDQ?: string[];
}

type season = {
    year: string,
    season: string,
    teams: {
        name: string,
        drivers: string[],
        color: string
    }[],
    events: {
        id: string,
        date: Date,
        result: raceResult
    }[],
    createdAt: Date,
    updatedAt: Date,
    quali: boolean,
    fastestLapPoints: number,
    fastestLapPosition: number,
    pointsDistribution: number[],
    pointsDistributionQuali?: number[]
}

// -----------------------------------------------------------
// Users
// -----------------------------------------------------------

//create a new user
async function createUser(name: any, email: any, password: any) {
    //check if user already exists
    const result = await findUserByEmail(email);
    if (result.length > 0) {
        return null;
    }
    else {
        //create a new user
        return client.postDocument({
            db: userdb,
            document: {
                _id: Uuid.v4(),
                name: name,
                email: email,
                password: password,
                createdAt: new Date()
            }
        });
    }
}

//get all user documents
async function getAllUsers() {
    return await client.postAllDocs({
        db: userdb,
        includeDocs: true
    })
}

//find user by id
async function findUserById(id: any) {
    let data = await getAllUsers();
    return data.result.rows.filter(user => { user.doc?._id === id });
}

//find user by email
async function findUserByEmail(email: any) {
    let data = await getAllUsers();
    return data.result.rows.filter(user => user.doc?.email === email);
}

// -----------------------------------------------------------
// Drivers
// -----------------------------------------------------------

// create a new driver
async function createDriver(name: string) {
    return client.postDocument({
        db: driverdb,
        document: {
            name: name,
            createdAt: new Date(),
            updatedAt: new Date()
        }
    });
}

// get all drivers
async function getAllDrivers() {
    return await client.postAllDocs({
        db: driverdb,
        includeDocs: true
    });
}

// find driver by id
async function findDriverById(id: string) {
    return await client.getDocument({ docId: id, db: driverdb });
}

// update a driver
async function updateDriver(id: string, name: string) {
    let oldDoc = await findDriverById(id);
    return await client.postDocument({
        db: driverdb,
        document: {
            _id: id,
            _rev: oldDoc.result._rev,
            name: name,
            createdAt: oldDoc.result.createdAt,
            updatedAt: new Date()
        }
    });
}

// -----------------------------------------------------------
// Events
// -----------------------------------------------------------

// create a new event
async function createEvent(threeLetterCode: string, country: string) {

    // check if country exists
    let countryExists = await checkCountryExists(country);
    if (countryExists) {
        // country exists, creating event
        return client.postDocument({
            db: eventdb,
            document: {
                threeLetterCode: threeLetterCode,
                country: country,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });
    } else {
        // country does not exist
        return null;
    }
}

// check if country exists
async function checkCountryExists(country: string) {
    let countries = countryList.getNames();
    if (countries.includes(country)) {
        return true;
    } else {
        return false;
    }
}

// get all events
async function getAllEvents() {
    return await client.postAllDocs({
        db: eventdb,
        includeDocs: true
    });
}

// find event by id
async function findEventById(id: string) {
    return await client.getDocument({ docId: id, db: eventdb });
}

// update an event
async function updateEvent(id: string, threeLetterCode: string, country: string) {

    // check if country exists
    let countryExists = await checkCountryExists(country);
    if (countryExists) {
        let oldDoc = await findEventById(id);
        return await client.postDocument({
            db: eventdb,
            document: {
                _id: id,
                _rev: oldDoc.result._rev,
                threeLetterCode: threeLetterCode,
                country: country,
                createdAt: oldDoc.result.createdAt,
                updatedAt: new Date()
            }
        });
    } else {
        // country does not exist
        return null;
    }
}

// -----------------------------------------------------------
// Seasons
// -----------------------------------------------------------

// create a new season
async function createSeason(
    year: string,
    seasonNr: string,
    teams: { name: string; drivers: string[]; color: string; }[],
    events: any[],
    quali: boolean,
    fastestLapPoint: number,
    fastestLapPosition: number, // highest position for the fastest lap point to be awarded
    pointsDistribution: number[], // value of points for each position in the race. First Arr Element is mapped to first position
    pointsDistributionQuali: number[] | undefined, // equivalent to pointsDistribution    
) {

    let result = generateRaceResults(quali);

    // append results to each event
    events.forEach(event => event.result = result);

    // create season object
    let season: season = {
        year: year,
        season: seasonNr,
        teams,
        events,
        quali,
        createdAt: new Date(),
        updatedAt: new Date(),
        pointsDistribution: pointsDistribution,
        fastestLapPoints: fastestLapPoint,
        fastestLapPosition: fastestLapPosition,
    }
    if (quali) {
        season.pointsDistributionQuali = pointsDistributionQuali;
    }

    // check if season already exists
    let seasonExists = await checkSeasonExists(year, seasonNr);
    if (seasonExists) {
        return null;
    } else {
        // season does not exist, creating season
        return client.postDocument({
            db: seasondb,
            document: season
        });
    }
}

// get all seasons
async function getAllSeasons() {
    return await client.postAllDocs({
        db: seasondb,
        includeDocs: true
    });
}

// get all seasons for a specific year
async function getAllSeasonsForYear(year: string) {
    let data = await getAllSeasons();
    return data.result.rows.filter(season => season.doc?.year === year);
}

// get season by year and season number
async function getSeasonByYearAndSeason(year: string, seasonNr: string) {
    let data = await getAllSeasons();
    return data.result.rows.filter(season => season.doc?.year === year && season.doc?.season === seasonNr);
}

// check if season exists
async function checkSeasonExists(year: string, seasonNr: string) {
    let data = await getAllSeasons();
    return data.result.rows.filter(season => season.doc?.year === year && season.doc?.season === seasonNr).length > 0;
}

// add new result to season / edit result
async function addResultToSeason(year: string, seasonNr: string, event: string, result: raceResult) {
    // get season data
    let season = await getSeasonByYearAndSeason(year, seasonNr);
    // find event in season
    let eventIndex = season[0].doc?.events.findIndex((e: { id: string; }) => e.id === event);
    if (eventIndex !== -1) {
        // event found, adding result
        if (season[0].doc !== undefined) {
            season[0].doc.events[eventIndex].result = result;
            return client.postDocument({
                db: seasondb,
                document: season[0].doc
            });
        }
    } else {
        // event not found
        return null;
    }
}

// update a season //not yet fully tested
async function updateSeason(
    year: string,
    seasonNr: string,
    teams: [{ name: string, drivers: string[], color: string }],
    events: [{ id: string, date: Date, result: raceResult }],
    quali: boolean,
    fastestLapPoint: number,
    fastestLapPosition: number, // highest position for the fastest lap point to be awarded
    pointsDistribution: number[], // value of points for each position in the race. First Arr Element is mapped to first position
    pointsDistributionQuali?: number[], // equivalent to pointsDistribution    
) {
    // get season data
    let season = await getSeasonByYearAndSeason(year, seasonNr);

    // update season object
    if (season[0].doc !== undefined) {
        season[0].doc.year = year;
        season[0].doc.season = seasonNr;
        season[0].doc.teams = teams;
        season[0].doc.fastestLapPoints = fastestLapPoint;
        season[0].doc.fastestLapPosition = fastestLapPosition;
        season[0].doc.pointsDistribution = pointsDistribution;
        season[0].doc.quali = quali;
        if (pointsDistributionQuali) {
            season[0].doc.pointsDistributionQuali = pointsDistributionQuali;
        }
        // update events
        let eventsArray = events;
        season[0].doc.events.forEach((event: { id: string; date: Date; result: raceResult; }) => {
            let eventIndex = eventsArray.findIndex(e => e.id === event.id);
            if (eventIndex !== -1) {
                // event already exists, adding respective result
                eventsArray[eventIndex].result = event.result;
            } else {
                // event is not yet in season, adding blank result

                let result = {
                    id: event.id,
                    date: event.date,
                    result: generateRaceResults(quali)
                };

                eventsArray[eventIndex] = result;
            }
        });

        // Check if any event will be deleted that has a result
        // get events that are in season[0].doc.events but not in eventsArray
        let eventsToRemove = season[0].doc.events.filter((event: { id: string; }) => eventsArray.findIndex(e => e.id === event.id) === -1);

        // remove events from eventsToRemove if they have no filled result
        eventsToRemove = eventsToRemove.filter((event: { result: raceResult; }) => event.result.drivers.length > 0);

        // if eventsToRemove is not empty, return null
        if (eventsToRemove.length > 0) {
            // user tried to delete events that already have results
            return null;
        }

        // add new events to season
        season[0].doc.events = eventsArray;

        // update database
        return client.postDocument({
            db: seasondb,
            document: season[0].doc
        });

    } else {
        // season does not exist
        return null;
    }
}

function generateRaceResults(quali: boolean): raceResult {
    // generate results object
    let result: raceResult = {
        drivers: [
            /* All drivers that participated in the race, and the respective team they drove for
                {
                    id: string, // driver id
                    team: string, // team name
                }
            */
        ],
        raceFinishOrder: [], // array of drivers ids
        fastestLap: "", // driver id
        fastestLapTime: 0, // time in seconds
        raceDNF: [], // array of drivers ids
        raceDQ: [], // array of drivers ids
    }
    if (quali) {
        result.qualiFinishOrder = [];
        result.qualiDQ = [];
        result.qualiFastestTime = 0;
    }
    return result;
}

module.exports = {
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
}