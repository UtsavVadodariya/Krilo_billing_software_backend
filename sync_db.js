const { sequelize } = require('./models_sql/index');

async function sync() {
    console.log('Syncing Database...');
    try {
        // alter: true updates tables if they exist to match schema
        // force: true drops tables and recreates them (DESTRUCTIVE)
        await sequelize.sync({ alter: true });
        console.log('Database Synced Successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Sync Error:', error);
        process.exit(1);
    }
}

sync();
