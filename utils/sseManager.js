// SSE Manager to handle client connections
class SSEManager {
  constructor() {
    this.clients = new Map(); // userId -> response object
    this.heartbeatInterval = 30000; // 30 seconds
    this.setupHeartbeat();
  }

  // Add a new client connection
  addClient(userId, res) {
    // Configure SSE connection
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    
    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connection', message: 'Connected to message stream' })}\n\n`);
    
    // Store the client connection
    this.clients.set(userId, res);
    
    // Handle client disconnect
    res.on('close', () => {
      this.removeClient(userId);
    });
    
    return res;
  }
  
  // Remove a client connection
  removeClient(userId) {
    if (this.clients.has(userId)) {
      console.log(`Client disconnected: ${userId}`);
      this.clients.delete(userId);
      return true;
    }
    return false;
  }
  
  // Send a message to a specific client
  sendToClient(userId, data) {
    if (this.clients.has(userId)) {
      this.clients.get(userId).write(`data: ${JSON.stringify(data)}\n\n`);
      return true;
    }
    return false;
  }
  
  // Send a message to multiple clients
  sendToClients(userIds, data) {
    userIds.forEach(userId => {
      this.sendToClient(userId, data);
    });
  }
  
  // Setup heartbeat to keep connections alive
  setupHeartbeat() {
    setInterval(() => {
      this.clients.forEach((res, userId) => {
        res.write(`:heartbeat\n\n`);
      });
    }, this.heartbeatInterval);
  }
  
  // Get all connected clients
  getConnectedClients() {
    return Array.from(this.clients.keys());
  }
}

// Create a singleton instance
const sseManager = new SSEManager();

export default sseManager; 