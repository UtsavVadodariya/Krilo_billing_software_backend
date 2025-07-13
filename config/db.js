const mongoose = require("mongoose")

mongoose.connect("mongodb+srv://utsavvadodariya2008:Utsav@162@cluster0.8a3idtg.mongodb.net/billing-software");

const db = mongoose.connection;

db.once("open",(err)=>{
    err ? console.log(err) : console.log("db Connected");
})

module.exports = db;
