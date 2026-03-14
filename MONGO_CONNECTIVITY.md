# MongoDB Connectivity (Atlas + Fallback)

This backend uses MongoDB Atlas in both development and production.

## Environment Variables

Set these in `server/.env` (local) and Render (production):

```dotenv
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/school_saas
MONGO_URI_STANDARD=mongodb://host1:27017,host2:27017,host3:27017/school_saas?replicaSet=atlas-cluster
```

## Connection Strategy

1. Try `MONGO_URI` (SRV) first.
2. If SRV DNS fails (`querySrv`, `ENOTFOUND`, `ECONNREFUSED`), fall back to `MONGO_URI_STANDARD` in development.
3. Retry up to 5 times with 2.5s delay.
4. If all attempts fail: log `MongoDB unreachable, using mock database` and keep server running.

Production always uses SRV only (no fallback).

## Expected Logs

```
MongoDB connection attempt 1
Trying SRV MongoDB connection...
SRV failed, trying standard MongoDB URI...
MongoDB connection attempt 2
Trying standard MongoDB URI...
MongoDB connected successfully
```

## Common Issues

- **SRV DNS blocked:** falls back to standard URI automatically.
- **Outbound 27017 blocked:** standard URI will fail with `EACCES` or timeout.
  - Fix by allowing outbound port 27017, switching networks, or using a VPN.

## Health Monitor

Every 30 seconds the server pings MongoDB and reconnects if disconnected.
