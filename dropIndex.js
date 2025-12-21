const mongoose = require('mongoose');
const uri = 'mongodb://localhost:27017/krilo_billing_software';

async function dropIndex() {
    try {
        await mongoose.connect(uri);
        console.log('Connected to DB');

        const collection = mongoose.connection.collection('a_application_login_id');

        // List indexes first
        const indexes = await collection.indexes();
        console.log('Indexes before:', indexes);

        // Drop the problematic index
        if (indexes.find(idx => idx.name === 'email_1')) {
            await collection.dropIndex('email_1');
            console.log('Dropped index: email_1');
        } else {
            console.log('Index email_1 not found');
        }

        const indexesAfter = await collection.indexes();
        console.log('Indexes after:', indexesAfter);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.connection.close();
    }
}

dropIndex();
