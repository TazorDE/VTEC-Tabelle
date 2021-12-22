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
function findSeasonByYear(year) {
    let data = getAllSeasons();
    return data.result.rows.filter(season => season.doc.year === year);
}

function findSeasonByYearAndSeasonNr(year, seasonNr) {
    let data = findSeasonByYear(year);
    return data.result.rows.filter(season => season.doc.seasonNr === seasonNr);
}

module.exports = {
    createUser,
    findUserById,
    findUserByEmail,
    createSeason,
    findSeasonByYear,
    findSeasonByYearAndSeasonNr
}