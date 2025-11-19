const { Client } = require('@microsoft/microsoft-graph-client');
require('isomorphic-fetch');

/**
 * Microsoft Graph Service
 * Handles user retrieval from Microsoft Graph API
 */
class GraphService {
    constructor() {
        this.appId = process.env.MICROSOFT_APP_ID;
        this.appPassword = process.env.MICROSOFT_APP_PASSWORD;
        this.tenantId = process.env.MICROSOFT_APP_TENANT_ID;
        this.graphClient = null;
    }

    /**
     * Get access token for Microsoft Graph API
     */
    async getAccessToken() {
        try {
            const tokenEndpoint = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;

            const params = new URLSearchParams();
            params.append('client_id', this.appId);
            params.append('client_secret', this.appPassword);
            params.append('scope', 'https://graph.microsoft.com/.default');
            params.append('grant_type', 'client_credentials');

            const response = await fetch(tokenEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: params
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to get access token: ${response.status} ${errorText}`);
            }

            const data = await response.json();
            return data.access_token;
        } catch (error) {
            console.error('[GraphService] Error getting access token:', error);
            throw error;
        }
    }

    /**
     * Initialize Graph client with access token
     */
    async initializeClient() {
        try {
            const accessToken = await this.getAccessToken();

            this.graphClient = Client.init({
                authProvider: (done) => {
                    done(null, accessToken);
                }
            });

            return this.graphClient;
        } catch (error) {
            console.error('[GraphService] Error initializing Graph client:', error);
            throw error;
        }
    }

    /**
     * Get organization users for approver selection
     * @param {number} top - Maximum number of users to retrieve (default: 100)
     * @param {string} filter - Optional OData filter (e.g., "accountEnabled eq true")
     * @returns {Promise<Array>} Array of user objects formatted for ChoiceSet
     */
    async getOrganizationUsers(top = 100, filter = null) {
        try {
            if (!this.graphClient) {
                await this.initializeClient();
            }

            console.log('[GraphService] Fetching organization users...');

            // Build the request
            let request = this.graphClient
                .api('/users')
                .select('id,displayName,mail,userPrincipalName')
                .top(top)
                .orderby('displayName');

            // Add filter if provided
            if (filter) {
                request = request.filter(filter);
            }

            const response = await request.get();
            const users = response.value || [];

            console.log(`[GraphService] Retrieved ${users.length} users`);

            // Format for Teams ChoiceSet
            return users
                .filter(user => user.displayName && user.id)
                .map(user => ({
                    title: user.displayName,
                    value: JSON.stringify({
                        id: user.id,
                        name: user.displayName,
                        email: user.mail || user.userPrincipalName
                    })
                }));

        } catch (error) {
            console.error('[GraphService] Error getting organization users:', error);

            // Return empty array instead of throwing to allow fallback to text input
            return [];
        }
    }

    /**
     * Search users by name
     * @param {string} searchQuery - Search query string
     * @param {number} top - Maximum number of results (default: 20)
     * @returns {Promise<Array>} Array of user objects formatted for ChoiceSet
     */
    async searchUsers(searchQuery, top = 20) {
        try {
            if (!this.graphClient) {
                await this.initializeClient();
            }

            console.log(`[GraphService] Searching users with query: ${searchQuery}`);

            // Use filter with startswith for display name
            const filter = `startswith(displayName,'${searchQuery}') or startswith(mail,'${searchQuery}')`;

            const response = await this.graphClient
                .api('/users')
                .select('id,displayName,mail,userPrincipalName')
                .filter(filter)
                .top(top)
                .orderby('displayName')
                .get();

            const users = response.value || [];

            console.log(`[GraphService] Found ${users.length} users matching query`);

            // Format for Teams ChoiceSet
            return users
                .filter(user => user.displayName && user.id)
                .map(user => ({
                    title: user.displayName,
                    value: JSON.stringify({
                        id: user.id,
                        name: user.displayName,
                        email: user.mail || user.userPrincipalName
                    })
                }));

        } catch (error) {
            console.error('[GraphService] Error searching users:', error);
            return [];
        }
    }

    /**
     * Get user by ID
     * @param {string} userId - User's Azure AD object ID
     * @returns {Promise<Object>} User object
     */
    async getUserById(userId) {
        try {
            if (!this.graphClient) {
                await this.initializeClient();
            }

            const user = await this.graphClient
                .api(`/users/${userId}`)
                .select('id,displayName,mail,userPrincipalName')
                .get();

            return {
                id: user.id,
                name: user.displayName,
                email: user.mail || user.userPrincipalName
            };

        } catch (error) {
            console.error('[GraphService] Error getting user by ID:', error);
            throw error;
        }
    }
}

module.exports.GraphService = GraphService;
