Deno.serve((req) => {
  if (req.headers.get("upgrade") === "websocket") {
    const { socket, response } = Deno.upgradeWebSocket(req);
    
    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: "connected",
        message: "连接成功"
      }));
    };
    
    socket.onmessage = (event) => {
      socket.send(JSON.stringify({
        type: "echo",
        data: event.data
      }));
    };
    
    return response;
  }
  
  return new Response("WebSocket服务器", { status: 200 });
});
