class QueueManager {
    constructor(maxConcurrent = 4, maxQueueSize = 100) {
        this.maxConcurrent = maxConcurrent;
        this.maxQueueSize = maxQueueSize;
        this.activeRequests = new Set();
        this.requestQueue = [];
        this.requestIdCounter = 0;
        
        // Rate limiting
        this.rateLimitDelay = 1000; // 1 second default delay between requests
        this.rateLimitBackoff = 1000; // Current backoff amount
        this.maxBackoff = 10000; // Maximum 10 seconds
        this.lastRequestTime = 0;

        console.log(`QueueManager initialized: ${maxConcurrent} concurrent, ${maxQueueSize} queue size`);
    }

    // Add request to queue with better deduplication
    enqueue(requestData, priority = 0) {
        return new Promise((resolve, reject) => {
            // Check if queue is full
            if (this.requestQueue.length >= this.maxQueueSize) {
                reject(new Error('Request queue is full'));
                return;
            }

            // Check for duplicates using subclass logic
            if (this.isDuplicateRequest(requestData)) {
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

            // Only log if queue is getting large
            if (this.requestQueue.length > 5) {
                console.log(`Request ${requestId} queued (priority: ${priority}, queue: ${this.requestQueue.length})`);
            }

            // Try to process immediately
            setImmediate(() => this.processQueue());
        });
    }

    // Check for duplicate requests (override in subclass)
    isDuplicateRequest(requestData) {
        return false; // Base implementation doesn't check
    }

    // Process the queue with improved rate limiting
    async processQueue() {
        while (this.canProcessMore() && this.requestQueue.length > 0) {
            const now = Date.now();
            const timeSinceLastRequest = now - this.lastRequestTime;

            // Check if we need to wait for rate limiting
            if (timeSinceLastRequest < this.rateLimitDelay) {
                const delay = this.rateLimitDelay - timeSinceLastRequest;
                setTimeout(() => this.processQueue(), delay);
                return;
            }

            const queueItem = this.requestQueue.shift();
            this.lastRequestTime = now;
            
            // Execute without blocking the queue processing
            this.executeRequest(queueItem);
        }
    }

    // Check if we can process more requests
    canProcessMore() {
        return this.activeRequests.size < this.maxConcurrent;
    }

    // Execute a request with better error handling
    async executeRequest(queueItem) {
        const { id, data, resolve, reject } = queueItem;

        this.activeRequests.add(id);
        
        try {
            const result = await this.processRequest(data);
            resolve(result);

            // Reset backoff on success
            if (this.rateLimitBackoff > 1000) {
                this.rateLimitBackoff = 1000;
                this.rateLimitDelay = 1000;
            }

        } catch (error) {
            // Handle different types of errors
            if (this.isRateLimitError(error)) {
                this.handleRateLimitError();
            } else {
                console.error(`Request ${id} failed:`, error.message);
            }
            
            reject(error);
        } finally {
            this.activeRequests.delete(id);
            
            // Continue processing queue
            setImmediate(() => this.processQueue());
        }
    }

    // Check if error is rate limiting
    isRateLimitError(error) {
        return error.status === 429 || 
               error.code === 'rate_limit_exceeded' ||
               error.message.includes('rate limit') ||
               error.message.includes('too many requests');
    }

    // Handle rate limit errors with exponential backoff
    handleRateLimitError() {
        this.rateLimitBackoff = Math.min(this.rateLimitBackoff * 1.5, this.maxBackoff);
        this.rateLimitDelay = this.rateLimitBackoff;
        
        console.log(`Rate limit hit, backing off to ${this.rateLimitDelay}ms`);
    }

    // Override this method with actual request processing logic
    async processRequest(requestData) {
        throw new Error('processRequest must be implemented by subclass');
    }

    // Update concurrent connection limit
    setMaxConcurrent(newLimit) {
        const oldLimit = this.maxConcurrent;
        this.maxConcurrent = Math.max(1, Math.min(20, newLimit)); // Limit between 1-20

        console.log(`Max concurrent updated: ${oldLimit} → ${this.maxConcurrent}`);

        // If limit increased, try to process more requests
        if (this.maxConcurrent > oldLimit) {
            setImmediate(() => this.processQueue());
        }
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
            isRateLimited: this.rateLimitDelay > 1000
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
        
        // Reset rate limiting
        this.rateLimitDelay = 1000;
        this.rateLimitBackoff = 1000;

        if (clearedCount > 0) {
            console.log(`Queue cleared: ${clearedCount} requests cancelled`);
        }

        return clearedCount;
    }

    // Get detailed metrics
    getMetrics() {
        const now = Date.now();
        const queueAges = this.requestQueue.map(item => now - item.timestamp);

        return {
            ...this.getStatus(),
            averageQueueTime: queueAges.length > 0 ?
                Math.round(queueAges.reduce((sum, age) => sum + age, 0) / queueAges.length) : 0,
            oldestQueuedRequest: queueAges.length > 0 ? Math.max(...queueAges) : 0,
            timeSinceLastRequest: now - this.lastRequestTime,
            requestIdCounter: this.requestIdCounter
        };
    }

    // Clean up old queue items (prevent memory leaks)
    cleanupOldRequests(maxAge = 300000) { // 5 minutes default
        const now = Date.now();
        const cutoff = now - maxAge;
        
        const beforeCount = this.requestQueue.length;
        this.requestQueue = this.requestQueue.filter(item => {
            if (item.timestamp < cutoff) {
                item.reject(new Error('Request expired'));
                return false;
            }
            return true;
        });

        const cleaned = beforeCount - this.requestQueue.length;
        if (cleaned > 0) {
            console.log(`Cleaned up ${cleaned} expired queue items`);
        }

        return cleaned;
    }
}

module.exports = QueueManager;