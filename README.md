# TrueNAS Setup Instructions for File Downloader API

## 1. Create the download directory with proper permissions

SSH into your TrueNAS server and run the following commands:

```bash
# Create the downloads directory if it doesn't exist
mkdir -p /mnt/Pool1/Network_Drive/downloads

# Set permissions (adjust UID/GID as needed)
# These should match the PUID/PGID values in docker-compose.yml
chown -R 1000:1000 /mnt/Pool1/Network_Drive/downloads
chmod -R 755 /mnt/Pool1/Network_Drive/downloads
```

## 2. Find the correct UID/GID for your TrueNAS user

Run these commands to determine the UID/GID of the user you want the container to run as:

```bash
# Find your user's UID
id -u your_username

# Find your user's GID
id -g your_username
```

## 3. Update docker-compose.yml with the correct UID/GID

Edit the docker-compose.yml file and update the PUID and PGID values with those found in step 2.

Example:
```yaml
environment:
  - PUID=1000  # Replace with your user's UID
  - PGID=1000  # Replace with your user's GID
```

## 4. Check ACLs (if using ZFS with ACLs enabled)

If you're using ZFS with ACLs, you might need to set appropriate ACLs:

```bash
# Set ACLs for the downloads directory
setfacl -m u:1000:rwx,g:1000:rwx /mnt/Pool1/Network_Drive/downloads
```