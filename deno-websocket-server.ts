const connections = new Map();
const rooms = new Map();

function generateId() {
  return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

Deno.serve((req) => {
  const url = new URL(req.url);
  
  if (req.headers.get("upgrade") === "websocket") {
    const { socket, response } = Deno.upgradeWebSocket(req);
    
    const openid = url.searchParams.get("openid") || "anonymous";
    const connectionId = generateId();
    
    socket.onopen = () => {
      connections.set(connectionId, {
        socket,
        openid,
        roomId: null,
        userInfo: { nickname: "用户" },
        joinTime: Date.now()
      });
      
      socket.send(JSON.stringify({
        type: "connected",
        data: {
          connectionId,
          openid,
          serverTime: Date.now(),
          message: "WebSocket连接成功"
        }
      }));
    };
    
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleMessage(connectionId, message);
      } catch (error) {
        console.error("消息解析错误:", error);
      }
    };
    
    socket.onclose = () => {
      handleDisconnection(connectionId);
    };
    
    return response;
  }
  
  return new Response("WebSocket服务器运行中", { status: 200 });
});

function handleMessage(connectionId: string, message: any) {
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
      joinRoom(connectionId, message.data.roomId, message.data.userInfo);
      break;
      
    case "leave_room":
      leaveRoom(connectionId, message.data.roomId);
      break;
      
    case "travel_update":
    case "expense_update":
    case "collaboration_message":
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

function joinRoom(connectionId: string, roomId: string, userInfo: any = {}) {
  const connection = connections.get(connectionId);
  if (!connection) return;
  
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set());
  }
  
  rooms.get(roomId)!.add(connectionId);
  connection.roomId = roomId;
  connection.userInfo = { ...connection.userInfo, ...userInfo };
  
  broadcastToRoom(roomId, {
    type: "user_joined",
    data: {
      openid: connection.openid,
      userInfo: connection.userInfo,
      roomId,
      timestamp: Date.now()
    }
  }, connectionId);
}

function leaveRoom(connectionId: string, roomId: string) {
  const connection = connections.get(connectionId);
  if (!connection) return;
  
  const room = rooms.get(roomId);
  if (room) {
    room.delete(connectionId);
    if (room.size === 0) {
      rooms.delete(roomId);
    }
  }
  
  connection.roomId = null;
  
  broadcastToRoom(roomId, {
    type: "user_left",
    data: {
      openid: connection.openid,
      roomId,
      timestamp: Date.now()
    }
  }, connectionId);
}

function broadcastToRoom(roomId: string, message: any, excludeConnectionId?: string) {
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

function handleDisconnection(connectionId: string) {
  const connection = connections.get(connectionId);
  if (!connection) return;
  
  if (connection.roomId) {
    leaveRoom(connectionId, connection.roomId);
  }
  
  connections.delete(connectionId);
}
// Deno Deploy WebSocket服务器 - 完整代码
// 文件名：main.ts

const connections = new Map();
const rooms = new Map();

function generateId() {
  return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

Deno.serve((req) => {
  const url = new URL(req.url);
  
  // 处理WebSocket升级
  if (req.headers.get("upgrade") === "websocket") {
    const { socket, response } = Deno.upgradeWebSocket(req);
    
    const openid = url.searchParams.get("openid") || "anonymous";
    const connectionId = generateId();
    
    socket.onopen = () => {
      connections.set(connectionId, {
        socket,
        openid,
        roomId: null,
        userInfo: { nickname: "用户" },
        joinTime: Date.now()
      });
      
      socket.send(JSON.stringify({
        type: "connected",
        data: {
          connectionId,
          openid,
          serverTime: Date.now(),
          message: "WebSocket连接成功"
        }
      }));
    };
    
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleMessage(connectionId, message);
      } catch (error) {
        console.error("消息解析错误:", error);
      }
    };
    
    socket.onclose = () => {
      handleDisconnection(connectionId);
    };
    
    return response;
  }
  
  // 普通HTTP请求
  return new Response("WebSocket服务器运行中", { status: 200 });
});

function handleMessage(connectionId: string, message: any) {
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
      joinRoom(connectionId, message.data.roomId, message.data.userInfo);
      break;
      
    case "leave_room":
      leaveRoom(connectionId, message.data.roomId);
      break;
      
    case "travel_update":
    case "expense_update":
    case "collaboration_message":
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

function joinRoom(connectionId: string, roomId: string, userInfo: any = {}) {
  const connection = connections.get(connectionId);
  if (!connection) return;
  
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set());
  }
  
  rooms.get(roomId)!.add(connectionId);
  connection.roomId = roomId;
  connection.userInfo = { ...connection.userInfo, ...userInfo };
  
  broadcastToRoom(roomId, {
    type: "user_joined",
    data: {
      openid: connection.openid,
      userInfo: connection.userInfo,
      roomId,
      timestamp: Date.now()
    }
  }, connectionId);
}

function leaveRoom(connectionId: string, roomId: string) {
  const connection = connections.get(connectionId);
  if (!connection) return;
  
  const room = rooms.get(roomId);
  if (room) {
    room.delete(connectionId);
    if (room.size === 0) {
      rooms.delete(roomId);
    }
  }
  
  connection.roomId = null;
  
  broadcastToRoom(roomId, {
    type: "user_left",
    data: {
      openid: connection.openid,
      roomId,
      timestamp: Date.now()
    }
  }, connectionId);
}

function broadcastToRoom(roomId: string, message: any, excludeConnectionId?: string) {
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

function handleDisconnection(connectionId: string) {
  const connection = connections.get(connectionId);
  if (!connection) return;
  
  if (connection.roomId) {
    leaveRoom(connectionId, connection.roomId);
  }
  
  connections.delete(connectionId);
}
