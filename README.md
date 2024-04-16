# Remote RTSP Server / UI
Simple server set up to stream RTSP from a Tapo TP-Link IP camera

## Setup
Copy `.env.sample` -> `.env` and add env vars. Then run
```
docker compose up --build
```

## Port Forwarding
Need to set up the following port forwarding

Original Port | Protocol | Fwd to Addr | Fwd to port 
--------------|----------|-------------|-------------
554 | TCP | [local camera IP] | 554
554 | UDP | [local camera IP] | 554
443 | TCP | [local camera IP] | 443
443 | UDP | [local camera IP] | 443

and then these rules
```
RTSP

TCP Any -> 554
UDP Any -> 554
```

and if its not already present
```
HTTPS

TCP Any -> 443
```
