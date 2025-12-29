const { sequelize, connectDB } = require('./config/database');
const { ApplicationLogin } = require('./models_sql/index');

async function debugDB() {
    console.log('--- Database Connection Debugger ---');
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(`Connecting to Host: ${process.env.DB_HOST}`);
    console.log(`Database Name: ${process.env.DB_NAME}`);
    console.log(`Port: ${process.env.DB_PORT}`);

    try {
        await connectDB();
        const users = await ApplicationLogin.findAll();
        console.log(`\nFound ${users.length} users in table 'a_application_logins'.`);
        users.forEach(u => console.log(` - ID: ${u.id}, Phone: ${u.phoneNumber}, DBName: ${u.databaseName}, Created: ${u.createdAt}`));
    } catch (e) {
        console.error('Debug Error:', e);
    } finally {
        await sequelize.close();
    }
}

debugDB();
