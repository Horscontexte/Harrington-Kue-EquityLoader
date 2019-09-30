const express = require('express')
const app = express()
const kue = require('kue')
const axios = require('axios')
const csv = require('fast-csv')
const fs = require('fs')
const queue = kue.createQueue()

// Poker_Equity_Results.csv
var stream = fs.createReadStream("./17.csv");
let title;
let hero;
let vilain;
let vilain_percentage;
let loose_percentage;
let split;

// 1. Read the CSV and get values
function ReadCSV () {
  csv
  .parseStream(stream, {headers : ["hero","vilain","victory_percentage","loose_percentage","split_percentage"]})
  .on("data", function(data){
    title = data.hero + data.vilain
    hero = data.hero;
    vilain = data.vilain;
    victory_percentage = data.victory_percentage;
    loose_percentage = data.loose_percentage;
    split = data.split_percentage;
    console.log("Info - Une rencontre est trouvé: " + title);
    queue
    .create('equitys to push', {
      title: title,
      data: {
        hero: hero,
        vilain: vilain,
        victory_percentage: victory_percentage,
        loose_percentage: loose_percentage,
        split: split
      }
    })
    .priority('high')
    .save()
  })
  .on("end", function(){
    console.log('Job is done, file queued')
  })
  .on("error", function(err) {
    console.log(err)
  });
}


app.get('/', function(req, res) {
  res.send('We are online !')
})

app.get('/start', function(req, res) {
  ReadCSV ()
  res.send('Starting the work, please be patient')
})

app.get('/removeAll', function(req, res) {
  kue.Job.rangeByState('inactive', 0, 100000, 'asc', function( err, selectedJobs ) {
    selectedJobs.forEach(function(job){
      job.remove()
    })
  })
  res.send('Removing all inactive jobs !')
  console.log('we remove all inactive jobs!')
})

queue.process('equitys to push', (job, done) => {
  axios.post('http://localhost:3000/equitys/',{
    title: job.data.title,
    heroHand: job.data.data.hero,
    vilainHand: job.data.data.vilain,
    heroEquity: job.data.data.victory_percentage,
    vilainEquity: job.data.data.loose_percentage,
    splitEquity: job.data.data.split
  })
  .then(response => {
    console.log("Info - creating : " + response.data.title)
    done()
  })
  .catch(error => {
    console.log("Error - While creating", error);
    done(error)
  });
})
app.use('/kue-api/', kue.app)

app.listen(5000, function() {
  console.log('App listening on port 5000!')
})
