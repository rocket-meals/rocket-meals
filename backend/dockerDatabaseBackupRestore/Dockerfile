# dockerDatabaseRestore/Dockerfile

FROM postgis/postgis:13-master

# Copy a restore script into the container
COPY restore.sh /usr/local/bin/restore.sh

# Make the script executable
RUN chmod +x /usr/local/bin/restore.sh

# Default command to run the restore script
CMD ["/usr/local/bin/restore.sh"]
