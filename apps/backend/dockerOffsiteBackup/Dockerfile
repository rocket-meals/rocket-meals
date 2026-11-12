# Offsite backup to a Google shared drive ("Backup Eingang").
# The container only uploads. It never deletes anything on Drive, and the service account it uses is
# only "Contributor" on the shared drive, so Google refuses deletes anyway. Moving the files into the
# archive, retention and trashing deleted images is done by an Apps Script in the owner's account
# (see apps-script/Code.gs and apps/backend/OFFSITE_BACKUP.md).
FROM rclone/rclone:1.68.2

RUN apk add --no-cache bash coreutils findutils tzdata

COPY backup.sh /backup.sh
COPY start.sh /start.sh
RUN chmod +x /backup.sh /start.sh

ENTRYPOINT ["/start.sh"]
CMD ["daily"]
