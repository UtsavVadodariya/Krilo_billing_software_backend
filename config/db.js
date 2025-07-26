const mongoose = require("mongoose")
import {mongooseDB} from '../utils/baseUrl'

mongoose.connect(`${mongooseDB}`);

const db = mongoose.connection;

db.once("open",(err)=>{
    err ? console.log(err) : console.log("db Connected");
})

module.exports = db;
