const mongoose = require("mongoose")

mongoose.connect("mongodb+srv://utsavvadodariya2008:Utsav%40162@cluster0.8a3idtg.mongodb.net/billing-software?retryWrites=true&w=majority&appName=Cluster0");

const db = mongoose.connection;

db.once("open",(err)=>{
    err ? console.log(err) : console.log("db Connected");
})

module.exports = db;
