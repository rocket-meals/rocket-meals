#!/bin/bash
echo "Setting read/write permission for uploads"
mkdir -p ./data/database_file_uploads/
# Directus runs as the 'node' user (UID 1000) inside the container.
# Set ownership to UID 1000 so the container can write uploads to the mounted host directory.
chown -R 1000:1000 ./data/database_file_uploads/
chmod -R 770 ./data/database_file_uploads/

echo "Setting read/write permission for database"
# Ensure the database directory exists
mkdir -p ./data/database/
# Set read/write/execute permissions for owner and group
chmod -R 770 ./data/database/

echo "Setting read/write permission for database backups"
# Ensure the database backups directory exists
mkdir -p ./data/database_backups/
# Set read/write/execute permissions for owner and group
chmod -R 770 ./data/database_backups/

echo "Setting read/write permission for directus sync backups"
# Backups of dashboard changes that the schema sync refused to overwrite
mkdir -p ./data/directus-sync-backups/
chmod -R 770 ./data/directus-sync-backups/

echo "Setting read/write permission for .env file"
# Set read/write permissions for owner and group on the .env file
chmod 660 .env

echo "Finished"
