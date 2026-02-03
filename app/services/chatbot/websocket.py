from typing import List
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            # Check if open before sending? FastAPI/Starlette usually handles checks or raises error
            try:
                await connection.send_json(message)
            except:
                # If connection dead, maybe remove? For now just ignore error
                pass

manager = ConnectionManager()
global_loop = None # Reference to main event loop for sync-to-async bridge
