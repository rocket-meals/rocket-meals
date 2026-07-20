#!/bin/bash

BACKUP_DIR="./../../database_backups"
DB_CONTAINER="rocket-meals-database"
DB_USER="directus"
DB_NAME="directus"

# Function to check for the presence of docker-compose or docker compose
get_docker_compose_cmd() {
    if command -v docker-compose &> /dev/null; then
        echo "docker-compose"
    elif docker compose version &> /dev/null; then
        echo "docker compose"
    else
        echo "Neither docker-compose nor docker compose is available. Please install one of them."
        exit 1
    fi
    return
}

DOCKER_COMPOSE_CMD=$(get_docker_compose_cmd)

# Function to list available backup files
select_backup() {
    echo "No specific backup file provided. Gathering available backups..."

    echo "Calculating total size of all backups..."
    total_size=$(du -sh "$BACKUP_DIR" | awk '{print $1}')
    echo "Total size of all backups: $total_size"

    # List all backup files (.sql and .gz) sorted by creation date with details
    echo "Available backups:"
    PS3="Select a backup file to restore: "

    backups=()
    options=()
    index=1

    for file in $(ls -t "$BACKUP_DIR"/*.sql*); do
        # Get the creation date in the desired format
        date=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$file" 2>/dev/null || stat --format="%y" "$file" 2>/dev/null)

        # Get the file size in human-readable format
        human_size=$(du -sh "$file" | awk '{print $1}')

        # Prepare the display format for selection
        options+=("$date - $human_size - $file")
        backups+=("$file")
        index=$((index + 1))
    done

    if [[ ${#backups[@]} -eq 0 ]]; then
        echo "No backup files found in $BACKUP_DIR."
        exit 1
    fi

    select choice in "${options[@]}"; do
        if [[ -n "$choice" ]]; then
            BACKUP_FILE="${backups[$REPLY-1]}"
            BACKUP_FILE_NAME=$(basename "$BACKUP_FILE")
            echo "Selected backup file: $BACKUP_FILE"
            break
        else
            echo "Invalid selection. Please try again."
        fi
    done
    return
}

# Main entry point
if [[ "$1" == "--restore-backup-file" ]]; then
    if [[ -z "$2" ]]; then
        echo "Please provide the path to the backup file."
        exit 1
    fi
    BACKUP_FILE="$2"
    BACKUP_FILE_NAME=$(basename "$BACKUP_FILE")
    echo "Selected backup file: $BACKUP_FILE"
else
    echo "No backup file provided. Listing available backups..."
    select_backup
fi

# Build the Docker image for the restore service before running it
echo "Building Docker image for the restore service..."
docker-compose build rocket-meals-database-restore

# Start the restore process using docker-compose with the specified profile
echo "Starting the restore process..."
BACKUP_FILE="$BACKUP_FILE_NAME" docker-compose --profile restore up rocket-meals-database-restore

# Optional: Stop the restore service after completion
echo "Stopping the restore service..."
docker-compose stop rocket-meals-database-restore

# Optional: Remove the restore service container
echo "Removing the restore service container..."
docker-compose rm -f rocket-meals-database-restore

echo "Database restore process completed."
