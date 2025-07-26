// export const MONGODBURL = 'mongodb+srv://utsavvadodariya2008:Utsav%40162@cluster0.8a3idtg.mongodb.net/billing-software?retryWrites=true&w=majority&appName=Cluster0';
const MONGODBURL = "mongodb://127.0.0.1/billing-software";
module.exports = { MONGODBURL };

// const MONGODBCONNECTURL = "mongodb+srv://utsavvadodariya2008:Utsav%40162@cluster0.8a3idtg.mongodb.net/krilo_billing_software?retryWrites=true&w=majority&appName=Cluster0";
const MONGODBCONNECTURL = "mongodb://localhost:27017/krilo_billing_software";
module.exports = { MONGODBCONNECTURL };

// export const CORSURL = 'http://krilobilling.easywayitsolutions.com';
const CORSURL = { origin: '*' };
module.exports = { CORSURL };
