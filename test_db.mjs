import { createClient } from "@libsql/client";

const db = createClient({ 
  url: "libsql://smm-kooookook1.aws-ap-northeast-1.turso.io", 
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODY5MzM3NjYsImlkIjoiMDFhMDBkOGMtMTgwMS03ODEzLTljNDAtZGFlOTUzMGEzZTAzIiwia2lkIjoiUGRFN0lpZE41Q012WFZNb2JlcnIwVWNxT18zSEItWTBQWS0wRXlZRWp0OCIsInJpZCI6ImMwOTlmZjI4LTVjYjgtNDk2NC1iM2YzLThiOGIzOTdiNTA4MiJ9.42AYmftctmmWZKOfddSe7punyPLXDEo_TlO0nMW0dpoXGEw2SYqsTg4dWc7f3W0xLvenTIMhgoU4Ly0tFDhUCg" 
});

async function run() {
  try {
    const result = await db.execute("PRAGMA table_info(users);");
    const columns = result.rows.map(r => r.name);
    console.log("Users table columns:", columns);
    if (columns.includes("verified_phone")) {
      console.log("SUCCESS: verified_phone column exists!");
    } else {
      console.log("ERROR: verified_phone column is MISSING!");
    }
  } catch (e) {
    console.error("DB Error:", e);
  }
}
run();
