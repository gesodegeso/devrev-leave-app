const redis = require('redis');

/**
 * Conversation Storage Service using Redis
 * Stores conversation references for proactive messaging
 */
class ConversationStorage {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.memoryCache = new Map(); // In-memory fallback
    }

    /**
     * Initialize Redis connection
     */
    async connect() {
        try {
            // Redis connection configuration from environment variables
            const redisConfig = {
                socket: {
                    host: process.env.REDIS_HOST || 'localhost',
                    port: parseInt(process.env.REDIS_PORT || '6379'),
                    reconnectStrategy: (retries) => {
                        if (retries > 10) {
                            console.error('[ConversationStorage] Redis reconnection failed after 10 attempts');
                            return new Error('Redis connection failed');
                        }
                        // Exponential backoff: 50ms, 100ms, 200ms, ...
                        return Math.min(retries * 50, 3000);
                    }
                }
            };

            // Add password if configured
            if (process.env.REDIS_PASSWORD) {
                redisConfig.password = process.env.REDIS_PASSWORD;
            }

            // Add database number if configured
            if (process.env.REDIS_DB) {
                redisConfig.database = parseInt(process.env.REDIS_DB);
            }

            this.client = redis.createClient(redisConfig);

            // Error handler
            this.client.on('error', (err) => {
                console.error('[ConversationStorage] Redis error:', err);
                this.isConnected = false;
            });

            // Ready handler
            this.client.on('ready', () => {
                console.log('[ConversationStorage] Redis connection established');
                this.isConnected = true;
            });

            // Reconnecting handler
            this.client.on('reconnecting', () => {
                console.log('[ConversationStorage] Redis reconnecting...');
            });

            // Connect to Redis
            await this.client.connect();

            console.log('[ConversationStorage] Redis client connected successfully');
            console.log('[ConversationStorage] Redis host:', redisConfig.socket.host);
            console.log('[ConversationStorage] Redis port:', redisConfig.socket.port);

            return true;
        } catch (error) {
            console.error('[ConversationStorage] Failed to connect to Redis:', error);
            console.warn('[ConversationStorage] Falling back to in-memory storage');
            this.isConnected = false;
            return false;
        }
    }

    /**
     * Disconnect from Redis
     */
    async disconnect() {
        if (this.client && this.isConnected) {
            try {
                await this.client.quit();
                console.log('[ConversationStorage] Redis connection closed');
            } catch (error) {
                console.error('[ConversationStorage] Error disconnecting from Redis:', error);
            }
        }
    }

    /**
     * Store conversation reference
     * @param {string} userId - Teams user ID
     * @param {object} conversationReference - Conversation reference object
     */
    async setConversationReference(userId, conversationReference) {
        try {
            // Always store in memory cache for fast access
            this.memoryCache.set(userId, conversationReference);

            // Store in Redis if connected
            if (this.isConnected && this.client) {
                const key = `conversation:${userId}`;
                const value = JSON.stringify(conversationReference);

                // Store with 30-day expiration (in seconds)
                const expirationSeconds = 30 * 24 * 60 * 60; // 30 days

                await this.client.setEx(key, expirationSeconds, value);

                console.log('[ConversationStorage] Stored conversation reference in Redis for user:', userId);
            } else {
                console.log('[ConversationStorage] Stored conversation reference in memory for user:', userId);
            }

            return true;
        } catch (error) {
            console.error('[ConversationStorage] Error storing conversation reference:', error);
            // Fallback to memory storage is already done above
            return false;
        }
    }

    /**
     * Get conversation reference
     * @param {string} userId - Teams user ID
     * @returns {object|null} Conversation reference or null if not found
     */
    async getConversationReference(userId) {
        try {
            // Try memory cache first (fastest)
            const cached = this.memoryCache.get(userId);
            if (cached) {
                console.log('[ConversationStorage] Retrieved conversation reference from memory for user:', userId);
                return cached;
            }

            // Try Redis if connected
            if (this.isConnected && this.client) {
                const key = `conversation:${userId}`;
                const value = await this.client.get(key);

                if (value) {
                    const conversationReference = JSON.parse(value);

                    // Store in memory cache for future fast access
                    this.memoryCache.set(userId, conversationReference);

                    console.log('[ConversationStorage] Retrieved conversation reference from Redis for user:', userId);
                    return conversationReference;
                }
            }

            console.log('[ConversationStorage] No conversation reference found for user:', userId);
            return null;
        } catch (error) {
            console.error('[ConversationStorage] Error retrieving conversation reference:', error);
            return null;
        }
    }

    /**
     * Delete conversation reference
     * @param {string} userId - Teams user ID
     */
    async deleteConversationReference(userId) {
        try {
            // Remove from memory cache
            this.memoryCache.delete(userId);

            // Remove from Redis if connected
            if (this.isConnected && this.client) {
                const key = `conversation:${userId}`;
                await this.client.del(key);
                console.log('[ConversationStorage] Deleted conversation reference for user:', userId);
            }

            return true;
        } catch (error) {
            console.error('[ConversationStorage] Error deleting conversation reference:', error);
            return false;
        }
    }

    /**
     * Get all stored user IDs
     * @returns {array} Array of user IDs
     */
    async getAllUserIds() {
        try {
            if (this.isConnected && this.client) {
                // Get all keys matching the pattern
                const keys = await this.client.keys('conversation:*');
                // Extract user IDs from keys
                const userIds = keys.map(key => key.replace('conversation:', ''));
                console.log('[ConversationStorage] Retrieved', userIds.length, 'user IDs from Redis');
                return userIds;
            } else {
                // Return from memory cache
                const userIds = Array.from(this.memoryCache.keys());
                console.log('[ConversationStorage] Retrieved', userIds.length, 'user IDs from memory');
                return userIds;
            }
        } catch (error) {
            console.error('[ConversationStorage] Error retrieving user IDs:', error);
            return [];
        }
    }

    /**
     * Store approvers list
     * @param {array} approvers - Array of approver objects with {title, value}
     */
    async setApproversList(approvers) {
        try {
            // Store in memory cache
            this.memoryCache.set('approvers:list', approvers);

            // Store in Redis if connected
            if (this.isConnected && this.client) {
                const key = 'approvers:list';
                const value = JSON.stringify(approvers);

                // Store with 30-day expiration (in seconds)
                const expirationSeconds = 30 * 24 * 60 * 60; // 30 days

                await this.client.setEx(key, expirationSeconds, value);

                console.log('[ConversationStorage] Stored approvers list in Redis -', approvers.length, 'approvers');
            } else {
                console.log('[ConversationStorage] Stored approvers list in memory -', approvers.length, 'approvers');
            }

            return true;
        } catch (error) {
            console.error('[ConversationStorage] Error storing approvers list:', error);
            return false;
        }
    }

    /**
     * Get approvers list
     * @returns {array|null} Array of approvers or null if not found
     */
    async getApproversList() {
        try {
            // Try memory cache first (fastest)
            const cached = this.memoryCache.get('approvers:list');
            if (cached) {
                console.log('[ConversationStorage] Retrieved approvers list from memory -', cached.length, 'approvers');
                return cached;
            }

            // Try Redis if connected
            if (this.isConnected && this.client) {
                const key = 'approvers:list';
                const value = await this.client.get(key);

                if (value) {
                    const approvers = JSON.parse(value);

                    // Store in memory cache for future fast access
                    this.memoryCache.set('approvers:list', approvers);

                    console.log('[ConversationStorage] Retrieved approvers list from Redis -', approvers.length, 'approvers');
                    return approvers;
                }
            }

            console.log('[ConversationStorage] No approvers list found');
            return null;
        } catch (error) {
            console.error('[ConversationStorage] Error retrieving approvers list:', error);
            return null;
        }
    }

    /**
     * Get storage statistics
     * @returns {object} Storage statistics
     */
    async getStats() {
        const stats = {
            isConnected: this.isConnected,
            memoryCount: this.memoryCache.size,
            redisCount: 0
        };

        try {
            if (this.isConnected && this.client) {
                const keys = await this.client.keys('conversation:*');
                stats.redisCount = keys.length;
            }
        } catch (error) {
            console.error('[ConversationStorage] Error getting stats:', error);
        }

        return stats;
    }
}

module.exports = { ConversationStorage };
