class RequestQueue {
  constructor() {
    this.queue = []
    this.processing = new Set() // Track in-progress requests
    this.isProcessing = false
    this.maxConcurrent = 1 // Start conservative for API limits
    this.retryDelays = [1000, 3000, 10000] // 1s, 3s, 10s retry delays
    this.requestCounter = 0
    this.apiLimitDetected = false
    this.lastConcurrencyError = null
  }

  // Add request to queue
  enqueue(requestData, priority = 'normal') {
    const requestId = `req_${++this.requestCounter}_${Date.now()}`
    
    const queueItem = {
      id: requestId,
      priority, // 'high', 'normal', 'low'
      data: requestData,
      retryCount: 0,
      status: 'pending',
      createdAt: new Date(),
      attempts: []
    }

    // Insert based on priority
    if (priority === 'high') {
      this.queue.unshift(queueItem)
    } else {
      this.queue.push(queueItem)
    }

    console.log(`📥 Queued request ${requestId} (priority: ${priority}, queue size: ${this.queue.length})`)
    
    // Start processing if not already running
    if (!this.isProcessing) {
      this.startProcessing()
    }

    return requestId
  }

  // Start processing queue
  async startProcessing() {
    if (this.isProcessing) return
    
    this.isProcessing = true
    console.log('🚀 Queue processing started')

    while (this.queue.length > 0 || this.processing.size > 0) {
      // Process available slots
      while (this.queue.length > 0 && this.processing.size < this.maxConcurrent) {
        const item = this.queue.shift()
        this.processRequest(item)
      }

      // Wait before next check
      await this.sleep(100)
    }

    this.isProcessing = false
    console.log('⏸️ Queue processing stopped')
  }

  // Process individual request
  async processRequest(item) {
    this.processing.add(item.id)
    item.status = 'processing'
    
    const startTime = Date.now()
    console.log(`⚡ Processing request ${item.id} (attempt ${item.retryCount + 1})`)

    try {
      // Record attempt
      item.attempts.push({
        startTime: new Date(),
        retryCount: item.retryCount
      })

      // Call the actual LLM service
      const { llmService } = await import('./llmService.js')
      const result = await llmService.generateResponse(item.data)

      // Success
      const duration = Date.now() - startTime
      item.status = 'completed'
      item.result = result
      item.completedAt = new Date()
      
      console.log(`✅ Request ${item.id} completed in ${duration}ms`)
      
      // Reset concurrency detection on success
      this.resetConcurrencyLimits()
      
      // Trigger callback if provided
      if (item.data.onSuccess) {
        item.data.onSuccess(result, item.id)
      }

    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`❌ Request ${item.id} failed after ${duration}ms:`, error.message)
      
      // Record error
      item.attempts[item.attempts.length - 1].error = error.message
      item.attempts[item.attempts.length - 1].duration = duration

      // Handle concurrency limit errors
      if (this.isConcurrencyError(error)) {
        this.handleConcurrencyLimit(error)
      }

      // Retry logic
      if (item.retryCount < this.retryDelays.length) {
        const retryDelay = this.retryDelays[item.retryCount]
        item.retryCount++
        item.status = 'retrying'
        
        console.log(`🔄 Retrying request ${item.id} in ${retryDelay}ms (attempt ${item.retryCount + 1})`)
        
        // Re-queue after delay
        setTimeout(() => {
          if (item.data.priority === 'high') {
            this.queue.unshift(item)
          } else {
            this.queue.push(item)
          }
        }, retryDelay)
        
      } else {
        // Max retries exceeded
        item.status = 'failed'
        item.failedAt = new Date()
        
        console.error(`💀 Request ${item.id} failed permanently after ${item.retryCount} retries`)
        
        // Trigger error callback if provided
        if (item.data.onError) {
          item.data.onError(error, item.id)
        }
      }
    } finally {
      this.processing.delete(item.id)
    }
  }

  // Detect if error is due to concurrency limits
  isConcurrencyError(error) {
    const message = error.message?.toLowerCase() || ''
    return message.includes('concurrency limit') || 
           message.includes('too many requests') ||
           message.includes('rate limit') ||
           error.code === 'concurrency_limit_exceeded'
  }

  // Handle concurrency limit detection
  handleConcurrencyLimit(error) {
    this.apiLimitDetected = true
    this.lastConcurrencyError = error.message
    
    // Force single concurrent request
    if (this.maxConcurrent > 1) {
      const oldLimit = this.maxConcurrent
      this.maxConcurrent = 1
      console.log(`⚠️ API concurrency limit detected! Reducing from ${oldLimit} to 1 concurrent request`)
      console.log(`📊 API Error: ${error.message.substring(0, 100)}...`)
    }
  }

  // Reset concurrency limits (call after successful requests)
  resetConcurrencyLimits() {
    if (this.apiLimitDetected && this.maxConcurrent === 1) {
      // Could implement gradual increase logic here
      console.log('🔄 Could increase concurrency, but staying conservative at 1')
    }
  }

  // Get queue status
  getStatus() {
    return {
      queueSize: this.queue.length,
      processing: this.processing.size,
      isProcessing: this.isProcessing,
      maxConcurrent: this.maxConcurrent,
      totalRequests: this.requestCounter,
      apiLimitDetected: this.apiLimitDetected,
      lastConcurrencyError: this.lastConcurrencyError ? 
        this.lastConcurrencyError.substring(0, 100) + '...' : null
    }
  }

  // Get detailed queue info (for admin/debugging)
  getDetailedStatus() {
    return {
      ...this.getStatus(),
      queue: this.queue.map(item => ({
        id: item.id,
        priority: item.priority,
        status: item.status,
        retryCount: item.retryCount,
        createdAt: item.createdAt,
        botName: item.data.character_name
      })),
      processing: Array.from(this.processing)
    }
  }

  // Helper function
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Clear queue (for admin use)
  clear() {
    this.queue = []
    console.log('🗑️ Queue cleared')
  }
}

// Export singleton instance
export const requestQueue = new RequestQueue()