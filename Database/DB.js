const mongoose = require('mongoose');

require('dotenv').config();

module.exports = async() => {
    await mongoose.connect(process.env.DB_URL, {
            keepAlive: true,
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useFindAndModify: false,
        })
        .then(response => {
            console.log(
                `Connected to Mongo! Database name: "${response.connections[0].name}"`,
            );
        })
        .catch(err => {
            console.error('Error connecting to mongo', err);
        });
    return mongoose;
};