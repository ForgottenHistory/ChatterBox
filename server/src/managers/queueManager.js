class QueueManager {
    constructor(maxConcurrent = 4, maxQueueSize = 100) {
        this.maxConcurrent = maxConcurrent;
        this.maxQueueSize = maxQueueSize;
        this.activeRequests = new Set();
        this.requestQueue = [];
        this.requestIdCounter = 0;
        this.rateLimitBackoff = 1000; // Add this line

        console.log(`QueueManager initialized with ${maxConcurrent} max concurrent requests`);
    }

    // Add request to queue with deduplication
    enqueue(requestData, priority = 0) {
        return new Promise((resolve, reject) => {
            // Check if queue is full
            if (this.requestQueue.length >= this.maxQueueSize) {
                reject(new Error('Request queue is full'));
                return;
            }

            // Simple deduplication: check if similar request exists in queue
            if (this.isDuplicateRequest(requestData)) {
                console.log('Duplicate request detected, skipping');
                reject(new Error('Duplicate request already in queue'));
                return;
            }

            const requestId = ++this.requestIdCounter;
            const queueItem = {
                id: requestId,
                data: requestData,
                priority,
                resolve,
                reject,
                timestamp: Date.now()
            };

            // Insert based on priority (higher priority first)
            let insertIndex = this.requestQueue.length;
            for (let i = 0; i < this.requestQueue.length; i++) {
                if (this.requestQueue[i].priority < priority) {
                    insertIndex = i;
                    break;
                }
            }

            this.requestQueue.splice(insertIndex, 0, queueItem);

            console.log(`Request ${requestId} queued (priority: ${priority}, queue size: ${this.requestQueue.length})`);

            // Try to process immediately
            this.processQueue();
        });
    }

    // Check for duplicate requests (override in subclass for specific logic)
    isDuplicateRequest(requestData) {
        return false; // Base implementation doesn't check for duplicates
    }

    // Process the queue with rate limiting
    async processQueue() {
        while (this.canProcessMore() && this.requestQueue.length > 0) {
            // Check rate limiting
            const now = Date.now();
            const timeSinceLastRequest = now - this.lastRequestTime;

            if (timeSinceLastRequest < this.rateLimitDelay) {
                // Schedule next processing after delay
                const delay = this.rateLimitDelay - timeSinceLastRequest;
                console.log(`Rate limiting: waiting ${delay}ms before next request`);
                setTimeout(() => this.processQueue(), delay);
                break;
            }

            const queueItem = this.requestQueue.shift();
            this.lastRequestTime = now;
            this.executeRequest(queueItem);
        }
    }

    // Check if we can process more requests
    canProcessMore() {
        return this.activeRequests.size < this.maxConcurrent;
    }

    // Execute a request with backoff handling
    async executeRequest(queueItem) {
        const { id, data, resolve, reject } = queueItem;

        this.activeRequests.add(id);
        console.log(`Executing request ${id} (active: ${this.activeRequests.size}/${this.maxConcurrent})`);

        try {
            const result = await this.processRequest(data);
            resolve(result);

            // Reset backoff on success
            if (this.rateLimitBackoff > 1000) {
                this.rateLimitBackoff = 1000;
                console.log('Rate limit backoff reset after successful request');
            }

        } catch (error) {
            console.error(`Request ${id} failed:`, error);

            // Handle rate limiting with exponential backoff
            if (error.status === 429) {
                const oldBackoff = this.rateLimitBackoff || 1000;
                this.rateLimitBackoff = Math.min(oldBackoff * 1.5, 10000); // Max 10 seconds
                console.log(`Rate limit hit, next requests will wait ${this.rateLimitBackoff}ms`);

                // Add delay before processing next request
                setTimeout(() => this.processQueue(), this.rateLimitBackoff);
            }

            reject(error);
        } finally {
            this.activeRequests.delete(id);
            console.log(`Request ${id} completed (active: ${this.activeRequests.size}/${this.maxConcurrent})`);

            // Process next item in queue
            this.processQueue();
        }
    }

    // Check if error is rate limiting
    isRateLimitError(error) {
        return error.status === 429 || error.code === 'rate_limit_exceeded';
    }

    // Handle rate limit errors with exponential backoff
    handleRateLimitError() {
        console.log(`Rate limit hit, increasing delay to ${this.rateLimitBackoff}ms`);
        this.rateLimitDelay = this.rateLimitBackoff;
        this.rateLimitBackoff = Math.min(this.rateLimitBackoff * 2, this.maxBackoff);
    }

    // Override this method with actual request processing logic
    async processRequest(requestData) {
        throw new Error('processRequest must be implemented by subclass');
    }

    // Update concurrent connection limit
    setMaxConcurrent(newLimit) {
        const oldLimit = this.maxConcurrent;
        this.maxConcurrent = Math.max(1, newLimit);

        console.log(`Max concurrent connections updated: ${oldLimit} -> ${this.maxConcurrent}`);

        // If limit increased, try to process more requests
        if (this.maxConcurrent > oldLimit) {
            this.processQueue();
        }
    }

    // Set rate limiting delay
    setRateLimitDelay(delayMs) {
        this.rateLimitDelay = Math.max(100, delayMs);
        console.log(`Rate limit delay set to: ${this.rateLimitDelay}ms`);
    }

    // Get queue status
    getStatus() {
        return {
            maxConcurrent: this.maxConcurrent,
            activeRequests: this.activeRequests.size,
            queuedRequests: this.requestQueue.length,
            maxQueueSize: this.maxQueueSize,
            canAcceptRequests: this.requestQueue.length < this.maxQueueSize,
            rateLimitDelay: this.rateLimitDelay,
            rateLimitBackoff: this.rateLimitBackoff
        };
    }

    // Clear all queued requests (emergency stop)
    clearQueue() {
        const clearedCount = this.requestQueue.length;

        // Reject all queued requests
        this.requestQueue.forEach(item => {
            item.reject(new Error('Request cancelled - queue cleared'));
        });

        this.requestQueue = [];
        console.log(`Queue cleared: ${clearedCount} requests cancelled`);

        // Reset rate limiting
        this.rateLimitDelay = 1000;
        this.rateLimitBackoff = 1000;

        return clearedCount;
    }

    // Get queue metrics
    getMetrics() {
        const now = Date.now();
        const queueAges = this.requestQueue.map(item => now - item.timestamp);

        return {
            ...this.getStatus(),
            averageQueueTime: queueAges.length > 0 ?
                queueAges.reduce((sum, age) => sum + age, 0) / queueAges.length : 0,
            oldestQueuedRequest: queueAges.length > 0 ? Math.max(...queueAges) : 0,
            timeSinceLastRequest: now - this.lastRequestTime
        };
    }
}

module.exports = QueueManager;