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

//createUser("Test", "malte@malteteichert.de", "test");

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
function createSeason(creatorId, year, seasonNr, teams, drivers, events) {
    return client.db(datadb).insert({
        _id: Uuid.v4(),
        creatorId: creatorId,
        year: year,
        seasonNr: seasonNr,
        teams: teams,
        drivers: drivers,
        events: events,
        results: [],
        createdAt: new Date()
    })
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

module.exports = {
    createUser,
    findUserById,
    findUserByEmail,
    createSeason,
    findSeasonByYear
}