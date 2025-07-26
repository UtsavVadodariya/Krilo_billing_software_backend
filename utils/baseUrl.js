const baseUrl = 'http://localhost:5000';


// export const baseUrl = 'https://krilobilling.easywayitsolutions.com';
const mongooseDB = 'mongodb://127.0.0.1/billing-software';
// export const mongooseDB = 'mongodb+srv://utsavvadodariya2008:Utsav%40162@cluster0.8a3idtg.mongodb.net/billing-software?retryWrites=true&w=majority&appName=Cluster0';

const mongooseConnectIndex = 'mongodb://localhost:27017/krilo_billing_software';
// export const mongooseConnectIndex = 'mongodb+srv://utsavvadodariya2008:Utsav%40162@cluster0.8a3idtg.mongodb.net/krilo_billing_software?retryWrites=true&w=majority&appName=Cluster0';


module.exports = {
    baseUrl, mongooseDB, mongooseConnectIndex
};