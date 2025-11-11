const axios = require('axios');

class DevRevService {
    constructor() {
        this.apiToken = process.env.DEVREV_API_TOKEN;
        this.apiBaseUrl = process.env.DEVREV_API_BASE_URL || 'https://api.devrev.ai';
        this.defaultPartId = process.env.DEVREV_DEFAULT_PART_ID; // Default part/project ID

        if (!this.apiToken) {
            console.warn('WARNING: DEVREV_API_TOKEN is not set. DevRev integration will not work.');
        }
    }

    /**
     * Create a leave request ticket in DevRev
     * @param {Object} leaveData - Leave request data from adaptive card
     * @param {Object} requester - Teams user who submitted the request
     * @returns {Promise<{success: boolean, ticketId?: string, error?: string}>}
     */
    async createLeaveRequestTicket(leaveData, requester) {
        try {
            if (!this.apiToken) {
                throw new Error('DevRev API token is not configured');
            }

            const {
                startDate,
                endDate,
                reason,
                usePaidLeave,
                approver,
                approverUserId
            } = leaveData;

            // Calculate days
            const start = new Date(startDate);
            const end = new Date(endDate);
            const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

            // Create ticket title
            const title = `休暇申請: ${requester.name} (${startDate} ~ ${endDate})`;

            // Create detailed description
            const description = this.buildTicketDescription({
                requesterName: requester.name,
                requesterEmail: requester.email || requester.aadObjectId,
                requesterTeamsId: requester.id,
                startDate,
                endDate,
                days,
                reason,
                usePaidLeave: usePaidLeave === 'true',
                approver,
                approverUserId
            });

            // Prepare DevRev API request
            const ticketData = {
                type: 'ticket',
                title: title,
                body: description,
                applies_to_part: this.defaultPartId,
                owned_by: [], // Can be set to specific DevRev users if mapped
                tags: [
                    { name: 'leave-request' },
                    { name: usePaidLeave === 'true' ? 'paid-leave' : 'unpaid-leave' }
                ]
            };

            // Add approver information if available
            if (approverUserId) {
                ticketData.custom_fields = {
                    approver_teams_id: approverUserId,
                    approver_name: approver
                };
            }

            console.log('Creating DevRev ticket:', JSON.stringify(ticketData, null, 2));

            // Make API call to DevRev
            const response = await axios.post(
                `${this.apiBaseUrl}/internal/tickets.create`,
                ticketData,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('DevRev API response:', JSON.stringify(response.data, null, 2));

            if (response.data && response.data.ticket) {
                return {
                    success: true,
                    ticketId: response.data.ticket.id,
                    ticketUrl: `${this.apiBaseUrl}/tickets/${response.data.ticket.id}`
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
     * Get ticket by ID (for future use)
     */
    async getTicket(ticketId) {
        try {
            const response = await axios.get(
                `${this.apiBaseUrl}/internal/tickets.get`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiToken}`,
                        'Content-Type': 'application/json'
                    },
                    params: {
                        id: ticketId
                    }
                }
            );

            return response.data;
        } catch (error) {
            console.error('Error getting DevRev ticket:', error);
            throw error;
        }
    }

    /**
     * Update ticket status (for future use)
     */
    async updateTicketStatus(ticketId, status) {
        try {
            const response = await axios.post(
                `${this.apiBaseUrl}/internal/tickets.update`,
                {
                    id: ticketId,
                    status: status
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data;
        } catch (error) {
            console.error('Error updating DevRev ticket:', error);
            throw error;
        }
    }
}

module.exports.DevRevService = DevRevService;
