const sql = require('mssql');

const config = {
    user: 'sa',
    password: 'CompassCaging123!',
    server: 'localhost',
    database: 'CompassCaging',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function seed() {
    try {
        await sql.connect(config);

        // Seed Users
        await sql.query(`
            IF NOT EXISTS (SELECT * FROM Users WHERE Username = 'agraham')
            INSERT INTO Users (Username, Email, PasswordHash, Role, Initials)
            VALUES ('agraham', 'alyssa@compass.com', 'hashedpassword', 'Admin', 'AG')
        `);

        // Seed Clients
        await sql.query(`
            IF NOT EXISTS (SELECT * FROM Clients WHERE ClientCode = 'AFL')
            INSERT INTO Clients (ClientCode, ClientName) VALUES ('AFL', 'American Freedom League')

            IF NOT EXISTS (SELECT * FROM Clients WHERE ClientCode = 'CAND001')
            INSERT INTO Clients (ClientCode, ClientName) VALUES ('CAND001', 'Candidate One')
        `);

        console.log('Seed complete');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

seed();
