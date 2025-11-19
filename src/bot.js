const { ActivityHandler, CardFactory, MessageFactory, TeamsInfo } = require('botbuilder');
const { DevRevService } = require('./services/devrev');
const { GraphService } = require('./services/graphService');
const leaveRequestCard = require('./cards/leaveRequestCard.json');

class TeamsLeaveBot extends ActivityHandler {
    constructor(adapter) {
        super();
        this.adapter = adapter;
        this.devRevService = new DevRevService();
        this.graphService = new GraphService();

        // Handle messages
        this.onMessage(async (context, next) => {
            console.log('Received message:', context.activity.text);

            // Remove bot mentions to get clean text
            const text = this.removeBotMentions(context.activity.text).trim();

            console.log('Cleaned text:', text);

            // Handle different commands
            if (text === '休暇申請' || text.toLowerCase() === 'leave request') {
                await this.handleLeaveRequest(context);
            } else if (context.activity.value) {
                // Handle adaptive card submission (leave request or approval action)
                if (context.activity.value.action === 'approve' || context.activity.value.action === 'reject') {
                    await this.handleApprovalAction(context);
                } else {
                    await this.handleCardSubmit(context);
                }
            } else {
                // Unknown command
                await context.sendActivity('コマンドを認識できませんでした。「休暇申請」とメンションしてください。');
            }

            await next();
        });

        // Handle members added
        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            for (let cnt = 0; cnt < membersAdded.length; cnt++) {
                if (membersAdded[cnt].id !== context.activity.recipient.id) {
                    const welcomeMessage = 'こんにちは！休暇申請Botです。\n\n' +
                        '「@BotName 休暇申請」とメンションすると、休暇申請フォームを表示します。';
                    await context.sendActivity(welcomeMessage);
                }
            }
            await next();
        });
    }

    /**
     * Remove bot mentions from text
     */
    removeBotMentions(text) {
        if (!text) return '';

        // Remove <at>BotName</at> pattern
        let cleanText = text.replace(/<at>.*?<\/at>/gi, '');

        // Remove any remaining @ mentions
        cleanText = cleanText.replace(/@\S+/g, '');

        return cleanText.trim();
    }

    /**
     * Handle leave request command
     */
    async handleLeaveRequest(context) {
        try {
            console.log('Handling leave request command');

            // Get team members for approver selection
            const teamMembers = await this.getTeamMembersForSelection(context);

            // Create adaptive card with team members list
            const card = this.createLeaveRequestCard(teamMembers);

            await context.sendActivity({
                attachments: [CardFactory.adaptiveCard(card)]
            });

        } catch (error) {
            console.error('Error in handleLeaveRequest:', error);
            await context.sendActivity('エラーが発生しました。もう一度お試しください。');
        }
    }

    /**
     * Get team members for approver selection
     */
    async getTeamMembersForSelection(context) {
        try {
            const conversationType = context.activity.conversation.conversationType;

            // For personal (1-on-1) chats, use Microsoft Graph API to get organization users
            if (conversationType === 'personal') {
                console.log('Personal chat detected - using Graph API to retrieve organization users');

                // Use Graph API to get organization users
                // Only get active users, limit to 100 most common approvers
                const users = await this.graphService.getOrganizationUsers(
                    100,
                    'accountEnabled eq true'
                );

                if (users.length === 0) {
                    console.warn('Graph API returned no users - check permissions');
                }

                return users;
            }

            // For team/group chats, get members from the conversation
            const members = await TeamsInfo.getMembers(context);

            // Filter out the bot itself and current user
            const currentUserId = context.activity.from.id;
            const botId = context.activity.recipient.id;

            const filteredMembers = members.filter(m =>
                m.id !== currentUserId &&
                m.id !== botId &&
                m.userPrincipalName // Ensure it's a real user
            );

            // Format for ChoiceSet
            return filteredMembers.map(member => ({
                title: member.name,
                value: JSON.stringify({
                    id: member.id,
                    name: member.name,
                    email: member.email || member.userPrincipalName
                })
            }));

        } catch (error) {
            console.error('Error getting team members:', error);
            // Return empty array if we can't get members
            return [];
        }
    }

    /**
     * Create leave request card with team members for approver selection
     */
    createLeaveRequestCard(teamMembers = []) {
        // Clone the template card
        const card = JSON.parse(JSON.stringify(leaveRequestCard));

        // Find and replace the approver input field with ChoiceSet
        const approverInputIndex = card.body.findIndex(item =>
            item.type === 'Input.Text' && item.id === 'approver'
        );

        if (approverInputIndex !== -1 && teamMembers.length > 0) {
            // Replace text input with ChoiceSet
            card.body[approverInputIndex] = {
                type: 'Input.ChoiceSet',
                id: 'approver',
                style: 'filtered', // Enables search/filter functionality
                placeholder: '承認者を選択してください',
                choices: teamMembers
            };
        } else if (approverInputIndex !== -1) {
            // If no team members available, keep the text input but update placeholder
            card.body[approverInputIndex].placeholder = '承認者の名前を入力してください（チームメンバーを取得できませんでした）';
        }

        return card;
    }

    /**
     * Handle leave request created from DevRev webhook
     * Supports both custom objects and work items (tickets)
     */
    async handleLeaveRequestCreated(workItem) {
        try {
            console.log('[handleLeaveRequestCreated] Processing:', workItem.id);

            // Get custom fields (supports both custom objects and tickets)
            const fields = workItem.custom_fields || {};

            // Both custom objects and tickets use tnt__ prefix
            // Keeping fallback for backward compatibility
            const approverTeamsId = fields.tnt__approver_teams_id || fields.approver_teams_id;

            if (!approverTeamsId) {
                console.warn('[handleLeaveRequestCreated] No approver Teams ID found');
                return;
            }

            // Create approval request card
            const approvalCard = this.createApprovalCard(workItem);

            // Create conversation reference for the approver
            const conversationReference = {
                channelId: 'msteams',
                serviceUrl: process.env.BOT_SERVICE_URL || 'https://smba.trafficmanager.net/apac/',
                conversation: {
                    id: approverTeamsId,
                    tenantId: process.env.MICROSOFT_APP_TENANT_ID
                },
                user: {
                    id: approverTeamsId,
                    aadObjectId: approverTeamsId
                },
                bot: {
                    id: process.env.MICROSOFT_APP_ID,
                    name: 'Leave Request Bot'
                }
            };

            // Send proactive message to approver
            await this.adapter.continueConversation(conversationReference, async (turnContext) => {
                await turnContext.sendActivity({
                    attachments: [CardFactory.adaptiveCard(approvalCard)]
                });
                console.log('[handleLeaveRequestCreated] Approval request sent to:', approverTeamsId);
            });

        } catch (error) {
            console.error('[handleLeaveRequestCreated] Error:', error);
            throw error;
        }
    }

    /**
     * Create approval request Adaptive Card
     * Supports both custom objects and work items (tickets)
     */
    createApprovalCard(workItem) {
        const fields = workItem.custom_fields || {};

        // Both custom objects and tickets use tnt__ prefix
        // Keeping fallback for backward compatibility
        const getField = (tntName, regularName) => {
            return fields[tntName] || fields[regularName] || '不明';
        };

        const requesterName = getField('tnt__requester_name', 'requester_name');
        const startDate = getField('tnt__start_date', 'start_date');
        const endDate = getField('tnt__end_date', 'end_date');
        const daysCount = getField('tnt__days_count', 'days_count');
        const reason = getField('tnt__reason', 'reason');
        const leaveType = fields.tnt__leave_type || fields.leave_type || '';
        const additionalSystem = getField('tnt__additional_system', 'additional_system');
        const requesterTeamsId = fields.tnt__requester_teams_id || fields.requester_teams_id;

        return {
            $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
            type: 'AdaptiveCard',
            version: '1.4',
            body: [
                {
                    type: 'TextBlock',
                    text: '🔔 休暇申請の承認依頼',
                    weight: 'Bolder',
                    size: 'Large',
                    color: 'Accent'
                },
                {
                    type: 'TextBlock',
                    text: '以下の休暇申請が承認待ちです。',
                    wrap: true,
                    spacing: 'Small'
                },
                {
                    type: 'FactSet',
                    spacing: 'Medium',
                    facts: [
                        {
                            title: '申請ID:',
                            value: workItem.display_id || workItem.id
                        },
                        {
                            title: '申請者:',
                            value: requesterName
                        },
                        {
                            title: '開始日:',
                            value: startDate
                        },
                        {
                            title: '終了日:',
                            value: endDate
                        },
                        {
                            title: '日数:',
                            value: String(daysCount)
                        },
                        {
                            title: '理由:',
                            value: reason
                        },
                        {
                            title: '有給利用:',
                            value: leaveType === 'paid' ? 'はい' : 'いいえ'
                        },
                        {
                            title: '追加制度:',
                            value: additionalSystem !== '不明' ? additionalSystem : 'なし'
                        }
                    ]
                }
            ],
            actions: [
                {
                    type: 'Action.Submit',
                    title: '✅ 承認',
                    style: 'positive',
                    data: {
                        action: 'approve',
                        objectId: workItem.id,
                        displayId: workItem.display_id,
                        requesterName: requesterName,
                        requesterTeamsId: requesterTeamsId
                    }
                },
                {
                    type: 'Action.Submit',
                    title: '❌ 却下',
                    style: 'destructive',
                    data: {
                        action: 'reject',
                        objectId: workItem.id,
                        displayId: workItem.display_id,
                        requesterName: requesterName,
                        requesterTeamsId: requesterTeamsId
                    }
                }
            ]
        };
    }

    /**
     * Handle approval action (approve/reject)
     */
    async handleApprovalAction(context) {
        try {
            const data = context.activity.value;
            const action = data.action; // 'approve' or 'reject'
            const objectId = data.objectId;
            const displayId = data.displayId;
            const requesterName = data.requesterName;
            const requesterTeamsId = data.requesterTeamsId;

            console.log(`[handleApprovalAction] ${action} for object:`, objectId);

            // Update status in DevRev
            const newStatus = action === 'approve' ? 'approved' : 'rejected';
            await this.devRevService.updateLeaveRequestStatus(objectId, newStatus);

            // Send confirmation to approver
            const actionText = action === 'approve' ? '承認' : '却下';
            await context.sendActivity(`✅ 休暇申請 ${displayId} を${actionText}しました。`);

            // Notify requester
            await this.notifyRequester(requesterTeamsId, requesterName, displayId, newStatus);

        } catch (error) {
            console.error('[handleApprovalAction] Error:', error);
            await context.sendActivity('❌ 処理中にエラーが発生しました。');
        }
    }

    /**
     * Notify requester about approval result
     */
    async notifyRequester(requesterTeamsId, requesterName, displayId, status) {
        try {
            const statusText = status === 'approved' ? '承認されました' : '却下されました';
            const emoji = status === 'approved' ? '✅' : '❌';

            const conversationReference = {
                channelId: 'msteams',
                serviceUrl: process.env.BOT_SERVICE_URL || 'https://smba.trafficmanager.net/apac/',
                conversation: {
                    id: requesterTeamsId,
                    tenantId: process.env.MICROSOFT_APP_TENANT_ID
                },
                user: {
                    id: requesterTeamsId,
                    aadObjectId: requesterTeamsId
                },
                bot: {
                    id: process.env.MICROSOFT_APP_ID,
                    name: 'Leave Request Bot'
                }
            };

            await this.adapter.continueConversation(conversationReference, async (turnContext) => {
                await turnContext.sendActivity(
                    `${emoji} あなたの休暇申請（${displayId}）が${statusText}。`
                );
                console.log('[notifyRequester] Notification sent to:', requesterTeamsId);
            });

        } catch (error) {
            console.error('[notifyRequester] Error:', error);
        }
    }

    /**
     * Handle adaptive card submission
     */
    async handleCardSubmit(context) {
        try {
            console.log('Handling card submission');
            const submittedData = context.activity.value;

            console.log('Submitted data:', JSON.stringify(submittedData, null, 2));

            // Validate submitted data
            if (!submittedData.startDate || !submittedData.endDate || !submittedData.reason || !submittedData.approver) {
                await context.sendActivity('すべての必須フィールドを入力してください。');
                return;
            }

            // Parse approver data (it's a JSON string from ChoiceSet)
            let approverInfo;
            try {
                approverInfo = JSON.parse(submittedData.approver);
            } catch (error) {
                // If parsing fails, it might be a text input fallback
                console.log('Approver is not JSON, treating as text input');
                approverInfo = {
                    name: submittedData.approver,
                    id: '',
                    email: ''
                };
            }

            // Add parsed approver info to submitted data
            submittedData.approverName = approverInfo.name;
            submittedData.approverUserId = approverInfo.id;
            submittedData.approverEmail = approverInfo.email;

            // Send confirmation to user
            await context.sendActivity('休暇申請を受け付けました。DevRevチケットを作成しています...');

            // Create DevRev ticket
            const ticketResult = await this.devRevService.createLeaveRequestTicket(
                submittedData,
                context.activity.from
            );

            if (ticketResult.success) {
                let confirmationMessage = `✅ 休暇申請が完了しました！\n\n` +
                    `**休暇期間:** ${submittedData.startDate} ~ ${submittedData.endDate}\n` +
                    `**理由:** ${submittedData.reason}\n` +
                    `**有給利用:** ${submittedData.usePaidLeave === 'true' ? 'はい' : 'いいえ'}\n` +
                    `**承認者:** ${submittedData.approverName || '未指定'}\n\n`;

                if (ticketResult.displayId) {
                    confirmationMessage += `**申請ID:** ${ticketResult.displayId}\n`;
                }

                if (ticketResult.objectUrl) {
                    confirmationMessage += `**確認リンク:** ${ticketResult.objectUrl}`;
                }

                await context.sendActivity(confirmationMessage);
            } else {
                await context.sendActivity(`❌ エラーが発生しました: ${ticketResult.error}`);
            }

        } catch (error) {
            console.error('Error in handleCardSubmit:', error);
            await context.sendActivity('送信中にエラーが発生しました。もう一度お試しください。');
        }
    }
}

module.exports.TeamsLeaveBot = TeamsLeaveBot;
