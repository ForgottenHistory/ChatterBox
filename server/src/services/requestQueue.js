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