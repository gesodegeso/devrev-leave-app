const axios = require('axios');

class DevRevService {
    constructor() {
        this.apiToken = process.env.DEVREV_API_TOKEN;
        this.apiBaseUrl = process.env.DEVREV_API_BASE_URL || 'https://api.devrev.ai';
        this.defaultPartId = process.env.DEVREV_DEFAULT_PART_ID; // Default part/project ID

        // Work item type configuration: 'custom_object' or 'ticket'
        this.workItemType = process.env.DEVREV_WORK_ITEM_TYPE || 'custom_object';
        this.ticketType = process.env.DEVREV_TICKET_TYPE || 'ticket';
        this.ticketSubtype = process.env.DEVREV_TICKET_SUBTYPE || 'leave_request';
        this.customSchemaFragment = process.env.DEVREV_CUSTOM_SCHEMA_FRAGMENT;

        if (!this.apiToken) {
            console.warn('WARNING: DEVREV_API_TOKEN is not set. DevRev integration will not work.');
        }

        console.log(`[DevRev] Using work item type: ${this.workItemType}`);

        if (this.workItemType === 'ticket' && !this.customSchemaFragment) {
            console.warn('WARNING: DEVREV_CUSTOM_SCHEMA_FRAGMENT is not set. Custom fields may not work for tickets.');
        }
    }

    /**
     * Create a leave request in DevRev (Custom Object or Ticket)
     * @param {Object} leaveData - Leave request data from adaptive card
     * @param {Object} requester - Teams user who submitted the request
     * @returns {Promise<{success: boolean, objectId?: string, displayId?: string, error?: string}>}
     */
    async createLeaveRequestTicket(leaveData, requester) {
        // Delegate to appropriate method based on configuration
        if (this.workItemType === 'ticket') {
            return this.createLeaveRequestAsTicket(leaveData, requester);
        } else {
            return this.createLeaveRequestAsCustomObject(leaveData, requester);
        }
    }

    /**
     * Create a leave request as a custom object in DevRev
     * @param {Object} leaveData - Leave request data from adaptive card
     * @param {Object} requester - Teams user who submitted the request
     * @returns {Promise<{success: boolean, objectId?: string, displayId?: string, error?: string}>}
     */
    async createLeaveRequestAsCustomObject(leaveData, requester) {
        try {
            if (!this.apiToken) {
                throw new Error('DevRev API token is not configured');
            }

            const {
                startDate,
                endDate,
                reason,
                usePaidLeave,
                approverName,
                approverUserId,
                approverEmail
            } = leaveData;

            // Calculate days
            const start = new Date(startDate);
            const end = new Date(endDate);
            const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

            // Determine leave type (paid/unpaid)
            const leaveType = usePaidLeave === 'true' ? 'paid' : 'unpaid';

            // Prepare custom object data
            const customObjectData = {
                leaf_type: 'leave_request', // カスタムオブジェクトのリーフタイプ
                custom_schema_spec: {
                    tenant_fragment: true
                },
                custom_fields: {
                    tnt__requester_name: requester.name,
                    tnt__requester_email: requester.email || requester.aadObjectId || '',
                    tnt__requester_teams_id: requester.id,
                    tnt__start_date: startDate,
                    tnt__end_date: endDate,
                    tnt__days_count: days,
                    tnt__reason: reason,
                    tnt__approver_name: approverName || '',
                    tnt__approver_teams_id: approverUserId || '',
                    tnt__status: 'pending', // 初期ステータス
                    tnt__leave_type: leaveType, // 'paid' or 'unpaid'
                    tnt__additional_system: '' // AIが自動判別して追記するフィールド（初期値は空）
                }
            };

            console.log('Creating DevRev custom object:', JSON.stringify(customObjectData, null, 2));

            // Make API call to DevRev (custom objects endpoint)
            const response = await axios.post(
                `${this.apiBaseUrl}/custom-objects.create`,
                customObjectData,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('DevRev API response:', JSON.stringify(response.data, null, 2));

            // Extract custom object from response
            if (response.data && response.data.custom_object) {
                const customObject = response.data.custom_object;
                return {
                    success: true,
                    objectId: customObject.id,
                    displayId: customObject.display_id,
                    objectUrl: customObject.display_id ? `https://app.devrev.ai/custom/${customObject.display_id}` : null
                };
            } else {
                throw new Error('Unexpected response format from DevRev API');
            }

        } catch (error) {
            console.error('Error creating DevRev ticket:', error);

            let errorMessage = 'Unknown error';
            if (error.response) {
                // API responded with error
                console.error('DevRev API error response:', error.response.data);
                errorMessage = error.response.data.message || JSON.stringify(error.response.data);
            } else if (error.request) {
                // No response received
                errorMessage = 'No response from DevRev API';
            } else {
                // Error in setup
                errorMessage = error.message;
            }

            return {
                success: false,
                error: errorMessage
            };
        }
    }

    /**
     * Create a leave request as a Work Item (Ticket) in DevRev
     * @param {Object} leaveData - Leave request data from adaptive card
     * @param {Object} requester - Teams user who submitted the request
     * @returns {Promise<{success: boolean, objectId?: string, displayId?: string, error?: string}>}
     */
    async createLeaveRequestAsTicket(leaveData, requester) {
        try {
            if (!this.apiToken) {
                throw new Error('DevRev API token is not configured');
            }

            const {
                startDate,
                endDate,
                reason,
                usePaidLeave,
                approverName,
                approverUserId,
                approverEmail
            } = leaveData;

            // Calculate days
            const start = new Date(startDate);
            const end = new Date(endDate);
            const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

            // Determine leave type (paid/unpaid)
            const leaveType = usePaidLeave === 'true' ? 'paid' : 'unpaid';

            // Convert dates to ISO 8601 format (DevRev expects timestamp format)
            // Input: "2025-01-20" → Output: "2025-01-20T00:00:00.000Z"
            const startDateISO = new Date(startDate + 'T00:00:00.000Z').toISOString();
            const endDateISO = new Date(endDate + 'T00:00:00.000Z').toISOString();

            // Build title and body
            const title = `休暇申請: ${requester.name} (${startDate} ~ ${endDate})`;
            const body = this.buildTicketDescription({
                requesterName: requester.name,
                requesterEmail: requester.email || requester.aadObjectId || '',
                requesterTeamsId: requester.id,
                startDate,
                endDate,
                days,
                reason,
                usePaidLeave: usePaidLeave === 'true',
                approverName,
                approverUserId
            });

            // Prepare ticket data using works.create API
            const ticketData = {
                type: this.ticketType,
                title: title,
                body: body,
                applies_to_part: this.defaultPartId,
                custom_fields: {
                    requester_name: requester.name,
                    requester_email: requester.email || requester.aadObjectId || '',
                    requester_teams_id: requester.id,
                    start_date: startDateISO,  // ISO 8601 format
                    end_date: endDateISO,      // ISO 8601 format
                    days_count: days,
                    reason: reason,
                    approver_name: approverName || '',
                    approver_teams_id: approverUserId || '',
                    status: 'pending',
                    leave_type: leaveType,
                    additional_system: '', // AIが自動判別して追記するフィールド
                    request_type: 'leave_request' // カスタムフィールドで種別を管理
                }
            };

            // Add custom schema fragment if configured (required for custom fields)
            if (this.customSchemaFragment) {
                ticketData.custom_schema_fragments = [this.customSchemaFragment];
            }

            // Note: subtype requires a DevRev Subtype ID (not a string)
            // If you need to use subtype, set DEVREV_TICKET_SUBTYPE to the actual subtype ID
            // Example: DEVREV_TICKET_SUBTYPE=don:core:dvrv-us-1:devo/xxx:subtype/yyy
            if (this.ticketSubtype && this.ticketSubtype.startsWith('don:')) {
                ticketData.subtype = this.ticketSubtype;
            }

            console.log('[DevRev] Creating ticket:', JSON.stringify(ticketData, null, 2));

            // Make API call to DevRev (works.create endpoint)
            const response = await axios.post(
                `${this.apiBaseUrl}/works.create`,
                ticketData,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('[DevRev] API response:', JSON.stringify(response.data, null, 2));

            // Extract work item from response
            if (response.data && response.data.work) {
                const work = response.data.work;
                return {
                    success: true,
                    objectId: work.id,
                    displayId: work.display_id,
                    objectUrl: work.display_id ? `https://app.devrev.ai/work/${work.display_id}` : null
                };
            } else {
                throw new Error('Unexpected response format from DevRev API');
            }

        } catch (error) {
            console.error('[DevRev] Error creating ticket:', error);

            let errorMessage = 'Unknown error';
            if (error.response) {
                console.error('[DevRev] API error response:', error.response.data);
                errorMessage = error.response.data.message || JSON.stringify(error.response.data);
            } else if (error.request) {
                errorMessage = 'No response from DevRev API';
            } else {
                errorMessage = error.message;
            }

            return {
                success: false,
                error: errorMessage
            };
        }
    }

    /**
     * Update leave request status (supports both custom objects and tickets)
     */
    async updateLeaveRequestStatus(objectId, newStatus) {
        if (this.workItemType === 'ticket') {
            return this.updateTicketStatus(objectId, newStatus);
        } else {
            return this.updateCustomObjectStatus(objectId, newStatus);
        }
    }

    /**
     * Update custom object status
     */
    async updateCustomObjectStatus(objectId, newStatus) {
        try {
            console.log(`[DevRev] Updating custom object ${objectId} status to: ${newStatus}`);

            const response = await axios.post(
                `${this.apiBaseUrl}/custom-objects.update`,
                {
                    id: objectId,
                    custom_fields: {
                        tnt__status: newStatus
                    }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('[DevRev] Custom object status updated successfully');
            return {
                success: true,
                data: response.data
            };

        } catch (error) {
            console.error('[DevRev] Error updating custom object status:', error);

            if (error.response) {
                console.error('[DevRev] API error response:', error.response.data);
            }

            throw error;
        }
    }

    /**
     * Update ticket (work item) status
     */
    async updateTicketStatus(workId, newStatus) {
        try {
            console.log(`[DevRev] Updating ticket ${workId} status to: ${newStatus}`);

            const response = await axios.post(
                `${this.apiBaseUrl}/works.update`,
                {
                    id: workId,
                    type: this.ticketType,
                    custom_fields: {
                        status: newStatus
                    }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('[DevRev] Ticket status updated successfully');
            return {
                success: true,
                data: response.data
            };

        } catch (error) {
            console.error('[DevRev] Error updating ticket status:', error);

            if (error.response) {
                console.error('[DevRev] API error response:', error.response.data);
            }

            throw error;
        }
    }

    /**
     * Build ticket description from leave request data
     */
    buildTicketDescription(data) {
        const {
            requesterName,
            requesterEmail,
            requesterTeamsId,
            startDate,
            endDate,
            days,
            reason,
            usePaidLeave,
            approver,
            approverUserId
        } = data;

        let description = `# 休暇申請\n\n`;
        description += `## 申請者情報\n`;
        description += `- **名前**: ${requesterName}\n`;
        description += `- **メール/ID**: ${requesterEmail}\n`;
        description += `- **Teams User ID**: ${requesterTeamsId}\n\n`;

        description += `## 休暇詳細\n`;
        description += `- **開始日**: ${startDate}\n`;
        description += `- **終了日**: ${endDate}\n`;
        description += `- **日数**: ${days}日\n`;
        description += `- **有給休暇**: ${usePaidLeave ? 'はい' : 'いいえ'}\n\n`;

        description += `## 休暇理由\n`;
        description += `${reason}\n\n`;

        if (approver) {
            description += `## 承認者情報\n`;
            description += `- **名前**: ${approver}\n`;
            if (approverUserId) {
                description += `- **Teams User ID**: ${approverUserId}\n`;
            }
            description += `\n`;
        }

        description += `---\n`;
        description += `*この申請はMicrosoft Teamsの休暇申請Botから自動的に作成されました。*\n`;

        return description;
    }

    /**
     * Get work item by ID (for future use)
     * Latest API: works.get
     */
    async getWork(workId) {
        try {
            const response = await axios.get(
                `${this.apiBaseUrl}/works.get`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiToken}`,
                        'Content-Type': 'application/json'
                    },
                    params: {
                        id: workId
                    }
                }
            );

            return response.data.work;
        } catch (error) {
            console.error('Error getting DevRev work:', error);
            throw error;
        }
    }

    /**
     * Update work item (for future use)
     * Latest API: works.update
     */
    async updateWork(workId, updates) {
        try {
            const updateData = {
                id: workId,
                type: 'ticket', // Required for works.update
                ...updates
            };

            const response = await axios.post(
                `${this.apiBaseUrl}/works.update`,
                updateData,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data.work;
        } catch (error) {
            console.error('Error updating DevRev work:', error);
            throw error;
        }
    }
}

module.exports.DevRevService = DevRevService;
