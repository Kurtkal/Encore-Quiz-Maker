package store

import "encore.dev/storage/sqldb"

var DB = sqldb.NewDatabase("quiz_db", sqldb.DatabaseConfig{
	Migrations: "migrations",
})
