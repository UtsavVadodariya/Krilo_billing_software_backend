const mongoose = require('mongoose');
const uri = 'mongodb+srv://utsavvadodariya2008:Utsav%40162@cluster0.8a3idtg.mongodb.net/krilo_billing_software?retryWrites=true&w=majority&appName=Cluster0';

async function dropIndex() {
    try {
        await mongoose.connect(uri);
        console.log('Connected to DB');

        const collection = mongoose.connection.collection('a_application_login_id');

        // List indexes first
        const indexes = await collection.indexes();
        // console.log('Indexes before:', indexes); // Reduced noise

        // Drop the problematic index
        if (indexes.find(idx => idx.name === 'email_1')) {
            await collection.dropIndex('email_1');
            console.log('SUCCESS: Dropped index: email_1');
        } else {
            console.log('INFO: Index email_1 not found (already dropped or never existed)');
        }

        const indexesAfter = await collection.indexes();
        const hasEmailIndex = indexesAfter.find(idx => idx.name === 'email_1');
        console.log('VERIFICATION:', hasEmailIndex ? 'FAILED - email_1 still exists' : 'SUCCESS - email_1 is gone');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.connection.close();
    }
}

dropIndex();
