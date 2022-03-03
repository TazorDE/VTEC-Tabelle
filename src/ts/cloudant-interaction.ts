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
    drivers: { driverId: string, team: string }[],
    raceFinishOrder: string[],
    fastestLap: string,
    fastestLapTime: number,
    raceDNF: string[],
    raceDQ: string[],
    racePenalties: { driverId: string, time: number }[],
    sprint: {
        sprint: boolean,
        sprintFinishOrder: string[],
        sprintDNF: string[],
        sprintDQ: string[],
        sprintPenalties: { driverId: string, time: number }[],
        fastestDriver: string,
        fastestDriverTime: number
    },
    qualiFinishOrder?: string[],
    qualiDQ?: string[],
    qualiFastestTime?: number
};

type season = {
    year: string,
    seasonNr: string,
    createdAt: Date,
    updatedAt: Date,
    teams: {}[],
    events: {
        eventId: string,
        eventDate: Date,
        results: raceResult
    }[],
    quali: boolean,
    fastestLapPoints: number,
    fastestLapPosition: number,
    fastestLapPointsSprint: number,
    fastestLapPointSprint: number,
    pointsDistributionRace: number[],
    pointsDistributionSprint: number[],
    pointsDistributionQuali?: number[]
}

// -----------------------------------------------------------
// Users
// -----------------------------------------------------------

//create a new user
export async function createUser(name: any, email: any, password: any) {
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
export async function getAllUsers() {
    return await client.postAllDocs({
        db: userdb,
        includeDocs: true
    })
}

//find user by id
export async function findUserById(id: any) {
    let data = await getAllUsers();
    return data.result.rows.filter(user => { user.doc?._id === id });
}

//find user by email
export async function findUserByEmail(email: any) {
    let data = await getAllUsers();
    return data.result.rows.filter(user => user.doc?.email === email);
}

// -----------------------------------------------------------
// Drivers
// -----------------------------------------------------------

// create a new driver
export async function createDriver(name: string) {
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
export async function getAllDrivers() {
    return await client.postAllDocs({
        db: driverdb,
        includeDocs: true
    });
}

// check if a driver exists
export async function checkDriverExists(id: string) {
    let data = await client.postAllDocs({
        db: driverdb,
        includeDocs: false
    });
    let bool = false;
    data.result.rows.forEach(row => {
        if (row.id === id) {
            bool = true;
        }
    });
    return bool;
}

// find driver by id
export async function findDriverById(id: string) {
    return await client.getDocument({ docId: id, db: driverdb });
}

// update a driver
export async function updateDriver(id: string, name: string) {
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
export async function createEvent(threeLetterCode: string, country: string) {

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
export async function checkCountryExists(country: string) {
    let countries = countryList.getNames();
    if (countries.includes(country)) {
        return true;
    } else {
        return new Error("Country does not exist");
    }
}

export async function checkEventExists(id: string) {
    let allEvents = await client.postAllDocs({ db: eventdb, includeDocs: false });
    allEvents.result.rows.filter(event => event.id === id);
    if (allEvents.result.rows.length > 0) {
        return true;
    } else {
        return false;
    }
}

// get all events
export async function getAllEvents() {
    return await client.postAllDocs({
        db: eventdb,
        includeDocs: true
    });
}

// find event by id
export async function findEventById(id: string): Promise<any> {
    try {
        return await client.getDocument({ docId: id, db: eventdb });
    } catch (error) {
        return error;
    }
}

// update an event
export async function updateEvent(id: string, threeLetterCode: string, country: string) {

    // check if country exists
    let countryExists = await checkCountryExists(country);
    if (countryExists) {
        let oldDoc = await findEventById(id);
        if (oldDoc) {
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
            return new Error("Event does not exist");
        }
    } else {
        // country does not exist
        return new Error("Country does not exist");
    }
}

// -----------------------------------------------------------
// Seasons
// -----------------------------------------------------------

// generate a blank race result as a placeholder
function generateBlankRaceResult(quali: boolean): raceResult {
    let blankResult: raceResult = {
        drivers: [
            /* All drivers that participated in the race, and the respective team they drove for
                {
                    driverId: string, // driver id
                    team: string, // team name
                }
            */
        ],
        raceFinishOrder: [], // list of driver ids in order of finish
        fastestLap: "", // driver id of fastest lap
        fastestLapTime: 0, // time in seconds
        raceDNF: [], // list of driver ids that did not finish
        raceDQ: [], // list of driver ids that were disqualified
        racePenalties: [], // list of driver ids that had penalties and the respective penalty time
        sprint: {
            sprint: false, // true if a sprint was completed
            sprintFinishOrder: [], // list of driver ids in order of finish
            sprintDNF: [], // list of driver ids that did not finish
            sprintDQ: [], // list of driver ids that were disqualified
            sprintPenalties: [], // list of driver ids that had penalties and the respective penalty time
            fastestDriver: "", // driver id of fastest lap
            fastestDriverTime: 0 // time in seconds
        }
    }
    if (quali) {
        blankResult["qualiFinishOrder"] = [];
        blankResult["qualiDQ"] = [];
        blankResult["qualiFastestTime"] = 0;
    }

    return blankResult;
}

// create a new season
export async function createSeason(
    year: string,
    seasonNr: string,
    teamList: { name: string, drivers: string[]; color: string; }[],
    eventList: {
        id: string,
        date: Date,
    }[], // IDs and Date for each event in order of appearance
    quali: boolean,
    fastestLapPoints: number,
    fastestLapPosition: number,
    fastestLapPointSprint: number,
    pointsDistributionRace: number[],
    pointsDistributionSprint: number[],
    pointsDistributionQuali?: number[],
) {
    let blankResult: raceResult = generateBlankRaceResult(quali);

    // check if the drivers exist for each team
    for (let team of teamList) {
        for (let driver of team.drivers) {
            let driverExists = await checkDriverExists(driver);
            if (!driverExists) {
                return new Error("Driver does not exist");
            }
        }
    }

    // create season object
    let season: season = {
        year: year,
        seasonNr: seasonNr,
        createdAt: new Date(),
        updatedAt: new Date(),
        teams: teamList,
        events: [],
        quali: quali,
        fastestLapPoints: fastestLapPoints,
        fastestLapPosition: fastestLapPosition,
        fastestLapPointSprint: fastestLapPointSprint,
        pointsDistributionRace: pointsDistributionRace,
        pointsDistributionSprint: pointsDistributionSprint,
        fastestLapPointsSprint: 0
    }
    if (quali) {
        season["pointsDistributionQuali"] = pointsDistributionQuali;
    }

    // check if every event exists
    for (let event of eventList) {
        let eventExists = await checkEventExists(event.id);
        if (!eventExists) {
            return new Error("Event does not exist");
        }
    }

    // use the provided eventList to create the season's events
    eventList.forEach(async event => {
        season.events.push({
            eventId: event.id,
            eventDate: event.date,
            results: blankResult
        });
    });

    // create season in database
    return await client.postDocument({
        db: seasondb,
        document: season
    });
}

// get all seasons
export async function getAllSeasons(docs: boolean) {
    return await client.postAllDocs({
        db: seasondb,
        includeDocs: docs
    });
}

// get season by id
export async function getSeasonById(id: string) {
    try {
        return await client.getDocument({ docId: id, db: seasondb });
    } catch (error) {
        return error;
    }
}

// get season by year and season number
export async function getSeasonByYearAndSeason(year: string, seasonNr: string): Promise<any> {
    let allSeasons = await getAllSeasons(true);
    let season = allSeasons.result.rows.filter(season => season.doc?.year === year && season.doc?.seasonNr === seasonNr);
    if (season.length > 0) {
        return season[0].doc;
    } else {
        return new Error("Season does not exist");
    }
}

// check if a season exists
export async function checkSeasonExists(year: string, seasonNr: string) {
    let allSeasons = await getAllSeasons(true);
    let season = allSeasons.result.rows.filter(season => season.doc?.year === year && season.doc?.seasonNr === seasonNr);
    if (season.length > 0) {
        return true;
    } else {
        return false;
    }
}

// update a season
export async function updateSeason(
    id: string,
    rev: string,
    year: string,
    seasonNr: string,
    createdAt: Date,
    teamList: { name: string, drivers: string[]; color: string; }[],
    eventList: {
        eventId: string;
        eventDate: Date;
        results: raceResult;
    }[],
    quali: boolean,
    fastestLapPoints: number,
    fastestLapPosition: number,
    fastestLapPointSprint: number,
    pointsDistributionRace: number[],
    pointsDistributionSprint: number[],
    pointsDistributionQuali?: number[],
) {
    // check if the season exists
    let seasonExists = await checkSeasonExists(year, seasonNr);
    if (!seasonExists) {
        return new Error("Season does not exist");
    }

    // check if the drivers exist for each team
    for (let team of teamList) {
        for (let driver of team.drivers) {
            let driverExists = await checkDriverExists(driver);
            if (!driverExists) {
                return new Error("Driver does not exist");
            }
        }
    }

    // check if the event exists for each event
    for (let event of eventList) {
        let eventExists = await checkEventExists(event.eventId);
        if (!eventExists) {
            return new Error("Event does not exist");
        }
    }

    // check if the existing results contain qualifyings
    let currentQualiStatus = false;
    for (let event of eventList) {
        // check if the event has the key "qualiFinishOrder"
        if (event.results.qualiFinishOrder) {
            currentQualiStatus = true;
        }
    }

    // if currentQualiStatus is not equal to quali amend qualifyings to all events
    if ((currentQualiStatus !== quali) && (quali === true)) {
        for (let event of eventList) {
            event.results["qualiFinishOrder"] = event.results.raceFinishOrder;
            event.results["qualiDQ"] = [];
            event.results["qualiFastestTime"] = 0;
        }
    } else if ((currentQualiStatus !== quali) && (quali === false)) {
        // remove qualifyings from all events
        for (let event of eventList) {
            delete event.results["qualiFinishOrder"];
            delete event.results["qualiDQ"];
            delete event.results["qualiFastestTime"];
        }
    }

    // create season object
    let season: season = {
        year: year,
        seasonNr: seasonNr,
        createdAt: createdAt,
        updatedAt: new Date(),
        teams: teamList,
        events: eventList,
        quali: quali,
        fastestLapPoints: fastestLapPoints,
        fastestLapPosition: fastestLapPosition,
        fastestLapPointSprint: fastestLapPointSprint,
        pointsDistributionRace: pointsDistributionRace,
        pointsDistributionSprint: pointsDistributionSprint,
        fastestLapPointsSprint: 0
    }
    if (quali) {
        season["pointsDistributionQuali"] = pointsDistributionQuali;
    }

    // update season in database
    return await client.postDocument({
        db: seasondb,
        document: {
            _id: id,
            _rev: rev,
            ...season
        }
    });
}

// add a result to a season / update a result
export async function addResultToSeason(year: string, seasonNr: string, eventId: string, result: raceResult) {
    // check if the season exists
    let seasonExists = await checkSeasonExists(year, seasonNr);
    if (!seasonExists) {
        return new Error("Season does not exist");
    }

    // check if the event exists
    let eventExists = await checkEventExists(eventId);
    if (!eventExists) {
        return new Error("Event does not exist");
    }

    // get season
    try {
        let season = await getSeasonByYearAndSeason(year, seasonNr);

        // check if the event is in the season
        let eventInSeason = false;
        if (season.events) {
            for (let seasonEvent of season.events) {
                if (seasonEvent.eventId === eventId) {
                    eventInSeason = true;
                }
            }
        } else {
            return new Error("Season does not exist");
        }
        if (!eventInSeason) {
            return new Error("Event does not exist in season");
        } else {
            // update result
            let updatedEvent = season.events.find((event: { eventId: string; }) => event.eventId === eventId);
            updatedEvent.results = result;
        }

        // update season
        return await client.postDocument({
            db: seasondb,
            document: {
                _id: season._id,
                _rev: season._rev,
                ...season
            }
        });
    } catch (error) {
        return error;
    }
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
    getSeasonByYearAndSeason,
    checkSeasonExists,
    addResultToSeason,
    updateSeason
}

// example usage in comment form

// createSeason('2011', '1', [{ name: 'Mercedes', drivers: ['1b5f450c0f091f154c65fbad3592fdff', '80fda69200e9a7c50c2845ebfa6aaa04'], color: '#ffffff' }], [{ id: '8ecc2c46ddcfd1dd7c8fbc5c0171fa74', date: new Date() }], true, 0, 0, 0, [25, 18, 15], [0], [0]).then(console.log);
// checkEventExists('8ecc2c46ddcfd1dd7c8fbc5c0171fa74').then(console.log);
// checkDriverExists('a').then(console.log);
// findSeasonByYearAndSeasonNr('2011', '1').then(console.log);
// updateSeason('6b2f5706a1e15d7f7a5877a3ee432194', '2-57e127e7d4353b84ac1631f551a47b4a', '2011', '1', new Date("2022-02-28T22:37:16.466Z"), [{ name: 'Ferrari', drivers: ['80fda69200e9a7c50c2845ebfa6aaa04', '1b5f450c0f091f154c65fbad3592fdff'], color: '#1d1d1d' }], [{
//     eventId: '8ecc2c46ddcfd1dd7c8fbc5c0171fa74', eventDate: new Date(), results: {
//         "drivers": [],
//         "raceFinishOrder": [],
//         "fastestLap": "",
//         "fastestLapTime": 0,
//         "raceDNF": [],
//         "raceDQ": [],
//         "sprint": {
//             "sprint": false,
//             "sprintFinishOrder": [],
//             "sprintDNF": [],
//             "sprintDQ": [],
//             "fastestDriver": "",
//             "fastestDriverTime": 0
//         },
//         "qualiFinishOrder": [],
//         "qualiDQ": [],
//         "qualiFastestTime": 0
//     }
// }], true, 0, 0, 0, [25, 18, 15], [0], [0]).then(console.log);
// addResultToSeason('2011', '1', '8ecc2c46ddcfd1dd7c8fbc5c0171fa74', {
//     "drivers": [{ driverId: '80fda69200e9a7c50c2845ebfa6aaa04', team: 'Ferrari' }, { driverId: '1b5f450c0f091f154c65fbad3592fdff', team: 'Ferrari' }],
//     "raceFinishOrder": ['80fda69200e9a7c50c2845ebfa6aaa04', '1b5f450c0f091f154c65fbad3592fdff'],
//     "fastestLap": '80fda69200e9a7c50c2845ebfa6aaa04',
//     "fastestLapTime": 90.235,
//     "raceDNF": ['1b5f450c0f091f154c65fbad3592fdff'],
//     "raceDQ": [],
//     "sprint": {
//         "sprint": false,
//         "sprintFinishOrder": [],
//         "sprintDNF": [],
//         "sprintDQ": [],
//         "fastestDriver": "",
//         "fastestDriverTime": 0
//     },
//     "qualiFinishOrder": ['80fda69200e9a7c50c2845ebfa6aaa04', '1b5f450c0f091f154c65fbad3592fdff'],
//     "qualiDQ": [],
//     "qualiFastestTime": 87.5
// }).then(res => {
//     console.log(JSON.stringify(res));
// });