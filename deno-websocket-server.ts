const connections = new Map();
const rooms = new Map();

Deno.serve((req) => {
  if (req.headers.get("upgrade") != "websocket") {
    return new Response(null, { status: 426 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  const url = new URL(req.url);
  const openid = url.searchParams.get("openid") || "anonymous";
  const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  socket.addEventListener("open", () => {
    connections.set(connectionId, {
      socket,
      openid,
      roomId: null,
      userInfo: { nickname: "用户" }
    });

    socket.send(JSON.stringify({
      type: "connected",
      data: {
        connectionId,
        openid,
        message: "WebSocket连接成功"
      }
    }));
  });

  socket.addEventListener("message", (event) => {
    try {
      const message = JSON.parse(event.data);
      handleMessage(connectionId, message);
    } catch (error) {
      console.error("消息解析错误:", error);
    }
  });

  socket.addEventListener("close", () => {
    handleDisconnection(connectionId);
  });

  return response;
});

function handleMessage(connectionId, message) {
  const connection = connections.get(connectionId);
  if (!connection) return;

  switch (message.type) {
    case "heartbeat":
      connection.socket.send(JSON.stringify({
        type: "heartbeat",
        data: { pong: Date.now() }
      }));
      break;

    case "join_room":
      joinRoom(connectionId, message.data.roomId);
      break;

    case "travel_update":
    case "expense_update":
      broadcastToRoom(connection.roomId, {
        type: message.type,
        data: {
          ...message.data,
          openid: connection.openid,
          timestamp: Date.now()
        }
      }, connectionId);
      break;
  }
}

function joinRoom(connectionId, roomId) {
  const connection = connections.get(connectionId);
  if (!connection) return;

  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set());
  }

  rooms.get(roomId).add(connectionId);
  connection.roomId = roomId;
}

function broadcastToRoom(roomId, message, excludeConnectionId) {
  const room = rooms.get(roomId);
  if (!room) return;

  room.forEach((connId) => {
    if (connId !== excludeConnectionId) {
      const conn = connections.get(connId);
      if (conn && conn.socket.readyState === WebSocket.OPEN) {
        conn.socket.send(JSON.stringify(message));
      }
    }
  });
}

function handleDisconnection(connectionId) {
  const connection = connections.get(connectionId);
  if (!connection) return;

  if (connection.roomId) {
    const room = rooms.get(connection.roomId);
    if (room) {
      room.delete(connectionId);
      if (room.size === 0) {
        rooms.delete(connection.roomId);
      }
    }
  }

  connections.delete(connectionId);
}
