const { sequelize } = require('../models_sql');

const startKeepAlive = () => {
    // Run every 5 minutes (300,000 milliseconds)
    setInterval(async () => {
        try {
            await sequelize.query('SELECT 1');
            console.log('Keep-alive query executed successfully');
        } catch (error) {
            console.error('Error executing keep-alive query:', error);
        }
    }, 5 * 60 * 1000);

    console.log('Database keep-alive job started');
};

module.exports = { startKeepAlive };
