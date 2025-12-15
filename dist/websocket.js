import WebSocket from 'ws';
class WebSocketManager {
    clients = new Map();
    jobSubscribers = new Map();
    handleConnection(ws, request) {
        console.log('New WebSocket connection established');
        const client = {
            ws,
            subscribedJobs: new Set()
        };
        this.clients.set(ws, client);
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                this.handleMessage(client, message);
            }
            catch (err) {
                console.error('Invalid WebSocket message:', err);
                ws.send(JSON.stringify({ error: 'Invalid message format' }));
            }
        });
        ws.on('close', () => {
            console.log('WebSocket connection closed');
            this.cleanupClient(client);
        });
        ws.on('error', (err) => {
            console.error('WebSocket error:', err);
            this.cleanupClient(client);
        });
        // Send welcome message
        ws.send(JSON.stringify({ type: 'connected', message: 'WebSocket connected successfully' }));
    }
    handleMessage(client, message) {
        const { action, jobId } = message;
        if (action === 'subscribe' && jobId) {
            this.subscribeToJob(client, jobId);
        }
        else if (action === 'unsubscribe' && jobId) {
            this.unsubscribeFromJob(client, jobId);
        }
        else {
            client.ws.send(JSON.stringify({ error: 'Unknown action or missing jobId' }));
        }
    }
    subscribeToJob(client, jobId) {
        client.subscribedJobs.add(jobId);
        if (!this.jobSubscribers.has(jobId)) {
            this.jobSubscribers.set(jobId, new Set());
        }
        this.jobSubscribers.get(jobId).add(client.ws);
        console.log(`Client subscribed to job ${jobId}`);
        client.ws.send(JSON.stringify({ type: 'subscribed', jobId }));
    }
    unsubscribeFromJob(client, jobId) {
        client.subscribedJobs.delete(jobId);
        const subscribers = this.jobSubscribers.get(jobId);
        if (subscribers) {
            subscribers.delete(client.ws);
            if (subscribers.size === 0) {
                this.jobSubscribers.delete(jobId);
            }
        }
        console.log(`Client unsubscribed from job ${jobId}`);
        client.ws.send(JSON.stringify({ type: 'unsubscribed', jobId }));
    }
    cleanupClient(client) {
        for (const jobId of client.subscribedJobs) {
            this.unsubscribeFromJob(client, jobId);
        }
        this.clients.delete(client.ws);
    }
    // Method to emit progress updates to subscribers
    emitProgress(jobId, progress, status, message, data) {
        const subscribers = this.jobSubscribers.get(jobId);
        if (!subscribers)
            return;
        const update = {
            type: 'progress',
            jobId,
            progress,
            status,
            message,
            data,
            timestamp: new Date().toISOString()
        };
        const messageStr = JSON.stringify(update);
        subscribers.forEach(ws => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(messageStr);
            }
        });
        console.log(`Emitted progress for job ${jobId}: ${progress}% - ${status}`);
    }
    // Method to emit completion
    emitCompleted(jobId, videoId, duration) {
        const subscribers = this.jobSubscribers.get(jobId);
        if (!subscribers)
            return;
        const update = {
            type: 'completed',
            jobId,
            videoId,
            duration,
            timestamp: new Date().toISOString()
        };
        const messageStr = JSON.stringify(update);
        subscribers.forEach(ws => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(messageStr);
            }
        });
        console.log(`Emitted completion for job ${jobId}`);
    }
    // Method to emit error
    emitError(jobId, error) {
        const subscribers = this.jobSubscribers.get(jobId);
        if (!subscribers)
            return;
        const update = {
            type: 'error',
            jobId,
            error,
            timestamp: new Date().toISOString()
        };
        const messageStr = JSON.stringify(update);
        subscribers.forEach(ws => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(messageStr);
            }
        });
        console.log(`Emitted error for job ${jobId}: ${error}`);
    }
}
export const wsManager = new WebSocketManager();
//# sourceMappingURL=websocket.js.map