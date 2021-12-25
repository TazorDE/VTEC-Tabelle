const { CloudantV1 } = require('@ibm-cloud/cloudant');
require('dotenv').config();
const Uuid = require('uuid');

const userdb = "vtec-users"
const datadb = "vtec-data"

const client = CloudantV1.newInstance({});

//create a new user
async function createUser(name, email, password) {
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
async function findUserById(id) {
    let data = await getAllUsers();
    return data.result.rows.filter(user => user.doc._id === id);
}

//find user by email
async function findUserByEmail(email) {
    let data = await getAllUsers();
    return data.result.rows.filter(user => user.doc.email === email);
}

//create a new season in data
function createSeason(year, seasonNr, driverTeams, tracks) {
    let currentDate = new Date();
    let results = {};
    tracks.forEach(track => {
        results[track] = {
            "event": track,
            "raceResult": [],
            "qualiResult": [],
            "penalties": [],
            "fastestLap": "",
            "dnf": [],
            "heldAt": ""
        }
    })
    return client.postDocument({
        db: datadb,
        document: JSON.stringify({
            _id: Uuid.v4(),
            year: year,
            seasonNr: seasonNr,
            driverTeams: driverTeams,
            tracks: tracks,
            results: results,
            createdAt: currentDate,
            updatedAt: currentDate
        })
    });
}

//get all seasons
function getAllSeasons() {
    return client.postAllDocs({
        db: datadb,
        includeDocs: true
    })
}

//find season by year
async function findSeasonByYear(year) {
    let data = getAllSeasons();
    data = await data;
    return data.result.rows.filter(season => season.doc.year === year);
}

async function findSeasonByYearAndSeasonNr(year, seasonNr) {
    let data = findSeasonByYear(year);
    data = await data;
    return data.filter(season => season.doc.seasonNr === seasonNr);
}

async function updateSeason(year, seasonNr, doc) {
    let data = await findSeasonByYearAndSeasonNr(year, seasonNr);
    data = data[0];

    doc._id = data.doc._id;
    doc._rev = data.doc._rev;
    return client.postDocument({
        db: datadb,
        document: JSON.stringify(doc)
    })

}

async function addRaceResultToSeason(year, seasonNr, track, raceResult) {
    let data = await findSeasonByYearAndSeasonNr(year, seasonNr);
    data = data[0];

    //check if result already exists
    let raceResultExists = false;
    if(data.doc.results[track].fastestLap == "") {
        data.doc.results[track] = raceResult;
        data.doc.updatedAt = new Date();
        return updateSeason(year, seasonNr, data.doc);    
    }else{
        return null;
    }
}

module.exports = {
    createUser,
    findUserById,
    findUserByEmail,
    createSeason,
    getAllSeasons,
    findSeasonByYear,
    findSeasonByYearAndSeasonNr,
    addRaceResultToSeason,
    updateSeason
}