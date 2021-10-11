const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const databasePath = path.join(__dirname, "covid19India.db");

const app = express();
app.use(express.json());

let database = null;

const initializeBDAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () =>
      console.log("Server Running at http://localhost/:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeBDAndServer();

const convertStateObjectToResponseObject = (stateObject) => {
  return {
    stateId: stateObject.state_id,
    stateName: stateObject.state_name,
    population: stateObject.population,
  };
};

const convertDistrictObjectToResponseObject = (districtObject) => {
  return {
    districtId: districtObject.district_id,
    districtName: districtObject.district_name,
    stateId: districtObject.state_id,
    cases: districtObject.cases,
    cured: districtObject.cured,
    active: districtObject.active,
    deaths: districtObject.deaths,
  };
};

app.get("/states/", async (request, response) => {
  const stateListQuery = `
    SELECT *
    FROM state;`;
  const statesArray = await database.all(stateListQuery);
  response.send(
    statesArray.map((eachState) =>
      convertStateObjectToResponseObject(eachState)
    )
  );
});

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `
    SELECT *
    FROM state
    WHERE state_id = ${stateId};`;
  const stateDetails = await database.get(getStateQuery);
  response.send(convertStateObjectToResponseObject(stateDetails));
});

app.post("/districts/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const postDistrictQuery = `
  INSERT INTO district( district_name, state_id, cases, cured, active, deaths )
  VALUES ( '${districtName}', ${stateId}, ${cases}, ${cured}, ${active}, ${deaths} );`;
  await database.run(postDistrictQuery);
  response.send("District Successfully Added");
});

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const districtDetailQuery = `
  SELECT *
  FROM district
  WHERE district_id = ${districtId};`;
  const districtDetails = await database.get(districtDetailQuery);
  response.send(convertDistrictObjectToResponseObject(districtDetails));
});

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const districtDeleteQuery = `
  DELETE FROM district
  WHERE district_id = ${districtId};`;
  await database.run(districtDeleteQuery);
  response.send("District Removed");
});

app.put("/districts/:districtId/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const { districtId } = request.params;
  const updateDistrictQuery = `
  UPDATE district
  SET 
    district_name = '${districtName}',
    state_id = ${stateId},
    cases = ${cases},
    cured = ${cured},
    active = ${active},
    deaths = ${deaths}
  WHERE 
    district_id = ${districtId};`;
  await database.run(updateDistrictQuery);
  response.send("District Details Updated");
});

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getStateStatsQuery = `
  SELECT
      SUM(cases),
      SUM(cured),
      SUM(active),
      SUM(deaths)
    FROM
      district
    WHERE
      state_id=${stateId};`;
  const stateStats = await database.get(getStateStatsQuery);
  response.send({
    totalCases: stateStats["SUM(cases)"],
    totalCured: stateStats["SUM(cured)"],
    totalActive: stateStats["SUM(active)"],
    totalDeaths: stateStats["SUM(deaths)"],
  });
});

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getStateFromDistrictQuery = `
    SELECT
      state_name
    FROM
      district
    NATURAL JOIN
      state
    WHERE 
      district_id=${districtId};`;
  const state = await database.get(getStateFromDistrictQuery);
  response.send({ stateName: state.state_name });
});

module.exports = app;
