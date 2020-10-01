let express = require('express');
let app = express();
const bodyParser = require("body-parser");
var exphbs = require('express-handlebars');

const pg = require("pg");
const Pool = pg.Pool;

// use ssl connection
let useSSL = false;
let local = process.env.LOCAL || false;

if (process.env.DATABASE_URL && !local) {
  useSSL = true;
}

const connectionString = process.env.DATABASE_URL || 'postgresql://codex:pg123@localhost:5432/mental_illness';

const pool = new Pool({
  connectionString,
  ssl: useSSL
});
const mentalIllness = require("./mental");
const mental = mentalIllness(pool);

app.engine('handlebars', exphbs({ defaultLayout: 'main' }));
app.set('view engine', 'handlebars');

// app.use(express.static("public"));
app.use(express.static(__dirname + '/public'));
app.use(express.static('views/images'));
// parse appliction
app.use(bodyParser.urlencoded({ extended: false }));
// parse application / json
app.use(bodyParser.json());


app.get("/", function (req, res) {
  res.render("index", {
  });
});

// link to the form page
app.get("/goToForm", async function (req, res) {

  var description = await pool.query('SELECT symptoms.id, description, illness_id, names FROM symptoms join illnesses on illnesses.id = symptoms.illness_id order by illness_id ')

  const symptomNames = description.rows
  res.render("illnessForm", { symptomNames })
})

//this is for the graphs
app.get("/chart", async function (req, res) {

  res.render("chart")
})

app.post("/chart", function(req, res){

  let username = req.body.name;
  let userSurname = req.body.surname;

  mental.setNames(username);
  mental.setSurname(userSurname);

})

app.get('/chart', function(req, res){
  let enteredName = mental.getNames();
  let enteredSurname = mental.getSurname();

  res.render("/chart", {
    name : enteredName,
    surname : enteredSurname
  })
})

app.post("/goToForm", async function (req, res) {

  const answers = req.body;
  var description = await pool.query('SELECT symptoms.id, description, illness_id, names FROM symptoms join illnesses on illnesses.id = symptoms.illness_id order by illness_id ')

  const symptomNames = description.rows
  const illnessCounter = {

  };

  Object
    .keys(answers)
    .forEach(function (answer) {
      const parts = answer.split("_");
      const illness = parts[0];
      if (illnessCounter[illness] == undefined) {
        illnessCounter[illness] = 0;
      }

      if (answers[answer] === 'yes') {
        illnessCounter[illness]++;
      }
    });

  console.log(illnessCounter);

  console.log(Object.keys(illnessCounter).map(function (illness) {
    return {
      illness,
      count: illnessCounter[illness]
    }
  }));

  
  const screenData = {
    illnessCounter,
    // symptomNames,
    "bipolar": illnessCounter["Bipolar"],
    "bipolarNot": 5 - illnessCounter["Bipolar"],  

    "depression": illnessCounter["Deppression"],
    "depressionNot": 5 - illnessCounter["Deppression"],

    "schizophrenia": illnessCounter["Schizophrania"],
    "schizophreniaNot": 6 - illnessCounter["Schizophrania"]
  };

  res.render("chart", screenData);

});

let PORT = process.env.PORT || 2020;

app.listen(PORT, function () {
  console.log('App starting on port', PORT);
});