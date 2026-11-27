// Runs once when the Compose MongoDB volume is initially empty.
const app = db.getSiblingDB('universityDb');
app.createUser({
  user: process.env.APP_DB_USERNAME,
  pwd: process.env.APP_DB_PASSWORD,
  roles: [{ role: 'readWrite', db: 'universityDb' }],
});
