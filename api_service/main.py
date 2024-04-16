import cv2
import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pytapo import Tapo
from utils.setup_logger import setup_logger

load_dotenv()
CAMERA_ONE_USERNAME = os.getenv("CAMERA_ONE_USERNAME")
CAMERA_ONE_PASSWORD = os.getenv("CAMERA_ONE_PASSWORD")
CAMERA_ONE_IP = os.getenv("CAMERA_ONE_IP")
AUTHORIZED_TOKEN = os.getenv("AUTHORIZED_TOKEN") 

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
logger = setup_logger(__name__)


def validate_auth_token(x_auth_token: str = Header(None)):
    """
    Validate the 'X-Auth-Token' provided in the header.
    """
    if x_auth_token != AUTHORIZED_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid or missing authentication token")


def generate_frames(rtsp_url):
    """
    Generates opencv video stream for a given RTSP stream
    """
    while True:
        cap = cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)
        cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 10**9)

        if not cap.isOpened():
            cap.release()
            continue
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            (flag, encodedImage) = cv2.imencode(".jpg", frame)
            if not flag:
                continue
            yield (b'--frame\r\n' b'Content-Type: image/jpeg\r\n\r\n' + 
                   bytearray(encodedImage) + b'\r\n')

        cap.release()


def ensure_camera_connection():
    """
    Ensures the camera connection is established and valid by using the Tapo APIs.
    Tries to refresh and re-authenticate if necessary.
    """
    try:
        tapo_camera = Tapo(
            host=CAMERA_ONE_IP,
            user=CAMERA_ONE_USERNAME,
            password=CAMERA_ONE_PASSWORD,
            controlPort=443,
            printDebugInformation=False
        )
        # Check or refresh authentication token
        if not tapo_camera.ensureAuthenticated():
            tapo_camera.refreshStok()
            logger.info("Re-authenticated successfully with Tapo camera.")
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))


@app.get("/video_feed")
def video_feed(x_auth_token: str = Header(None)):
    # Authenticate user
    logger.info("authenticating user...")
    validate_auth_token(x_auth_token)
    
    # Ensure camera is responsive and authenticated
    logger.info("setting up camera connection...")
    ensure_camera_connection()
    
    logger.info("starting stream...")
    rtsp_url = f"rtsp://{CAMERA_ONE_USERNAME}:{CAMERA_ONE_PASSWORD}@{CAMERA_ONE_IP}:554/stream1"
    return StreamingResponse(generate_frames(rtsp_url), media_type="multipart/x-mixed-replace;boundary=frame")