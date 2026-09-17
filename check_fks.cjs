const fs = require('fs');
const lines = fs.readFileSync('hima_schema_pg.sql', 'utf8').split('\n');

let currentTable = null;
const tables = {};

for (const line of lines) {
    const tableMatch = line.match(/CREATE TABLE (IF NOT EXISTS )?([a-zA-Z_]+) \(/);
    if (tableMatch) {
        currentTable = tableMatch[2];
        tables[currentTable] = [];
    } else if (currentTable) {
        const refMatch = line.match(/([a-zA-Z_]+)\s+.*?REFERENCES users\(id\)/);
        if (refMatch) {
            tables[currentTable].push({
                col: refMatch[1],
                cascade: line.includes('ON DELETE CASCADE')
            });
        }
    }
}

for (const table in tables) {
    if (tables[table].length > 0) {
        console.log(Table: );
        for (const col of tables[table]) {
            console.log(  -  (Cascade: ));
        }
    }
}
