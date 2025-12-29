const mongoose = require('mongoose');
const { ApplicationLogin } = require('./models_sql/index'); // SQL Model
const User = require('./models/User'); // Mongo Model
const { mongooseConnectIndex } = require('./utils/baseUrl');
const { connectDB } = require('./config/database');

async function migrateData() {
    console.log('Starting Migration...');

    // 1. Connect to MySQL
    await connectDB();

    // 2. Connect to MongoDB
    await mongoose.connect(mongooseConnectIndex, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
    console.log('MongoDB Connected');

    try {
        // 3. Fetch all Mongo Users
        const mongoUsers = await User.find();
        console.log(`Found ${mongoUsers.length} users in MongoDB.`);

        let count = 0;
        for (const mUser of mongoUsers) {
            // Check if user already exists in MySQL (by phone number)
            const existing = await ApplicationLogin.findOne({ where: { phoneNumber: mUser.phoneNumber } });

            if (!existing) {
                try {
                    // 4. Create MySQL User (ApplicationLogin)
                    // Note: We cannot preserve Mongo _id as SQL id (integer). 
                    // We will rely on phoneNumber/databaseName as unique identifiers.
                    await ApplicationLogin.create({
                        phoneNumber: mUser.phoneNumber,
                        password: mUser.password, // Already hashed, copy as is
                        pin: mUser.pin,
                        databaseName: mUser.databaseName,
                        currentSessionKey: mUser.currentSessionKey,
                        lastLogin: mUser.lastLogin,
                        isActive: mUser.isActive,
                        subscriptionExpiry: mUser.subscriptionExpiry || new Date(new Date().setFullYear(new Date().getFullYear() + 1))
                    });
                    console.log(`Migrated User: ${mUser.phoneNumber}`);
                    count++;
                } catch (err) {
                    console.error(`Failed to migrate user ${mUser.phoneNumber}:`, err.message);
                }
            } else {
                console.log(`Skipping existing user: ${mUser.phoneNumber}`);
            }
        }

        console.log(`Migration Complete. ${count} users migrated.`);

    } catch (error) {
        console.error('Migration Error:', error);
    } finally {
        process.exit(0);
    }
}

migrateData();
