import { Response } from 'express';

interface SSEClient {
  id: string;
  orderId: string;
  contributionId: string;
  res: Response;
  createdAt: Date;
}

class SSEService {
  private clients: Map<string, SSEClient> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Send keepalive comment every 25 seconds to keep HTTP connections alive
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 25000);
  }

  public registerClient(orderId: string, contributionId: string, res: Response): string {
    const clientId = `${orderId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Set standard SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable proxy buffering (Nginx, etc.)
    });

    // Send initial connected event
    res.write(`event: connected\ndata: ${JSON.stringify({ clientId, orderId, timestamp: new Date().toISOString() })}\n\n`);

    const client: SSEClient = {
      id: clientId,
      orderId,
      contributionId,
      res,
      createdAt: new Date(),
    };

    this.clients.set(clientId, client);

    res.on('close', () => {
      this.clients.delete(clientId);
    });

    return clientId;
  }

  public broadcastStatus(orderId: string, statusPayload: {
    status: string;
    settlementState?: string | null;
    utr?: string | null;
    amount?: number | string;
    message?: string;
  }): void {
    const data = JSON.stringify({
      orderId,
      ...statusPayload,
      timestamp: new Date().toISOString(),
    });

    for (const [id, client] of this.clients.entries()) {
      if (client.orderId === orderId) {
        try {
          client.res.write(`event: payment_status\ndata: ${data}\n\n`);
        } catch (err) {
          console.error(`Error sending SSE to client ${id}:`, err);
          this.clients.delete(id);
        }
      }
    }
  }

  private sendHeartbeat(): void {
    for (const [id, client] of this.clients.entries()) {
      try {
        client.res.write(': keepalive\n\n');
      } catch {
        this.clients.delete(id);
      }
    }
  }

  public cleanup(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.clients.clear();
  }
}

export const sseService = new SSEService();
