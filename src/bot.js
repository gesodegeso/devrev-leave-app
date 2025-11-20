const { ActivityHandler, CardFactory, MessageFactory, TeamsInfo } = require('botbuilder');
const { DevRevService } = require('./services/devrev');
const { GraphService } = require('./services/graphService');
const { ConversationStorage } = require('./services/conversationStorage');
const leaveRequestCard = require('./cards/leaveRequestCard.json');
const leaveQuestionCard = require('./cards/leaveQuestionCard.json');

class TeamsLeaveBot extends ActivityHandler {
    constructor(adapter) {
        super();
        this.adapter = adapter;
        this.devRevService = new DevRevService();
        this.graphService = new GraphService();

        // Initialize conversation storage with Redis
        this.conversationStorage = new ConversationStorage();
        this.initializeStorage();

        // Handle messages
        this.onMessage(async (context, next) => {
            console.log('Received message:', context.activity.text);

            // Store conversation reference for proactive messaging
            this.addConversationReference(context.activity);

            // Remove bot mentions to get clean text
            const text = this.removeBotMentions(context.activity.text).trim();

            console.log('Cleaned text:', text);

            // Handle different commands
            if (text === '休暇申請' || text.toLowerCase() === 'leave request') {
                await this.handleLeaveRequest(context);
            } else if (text === '休暇の質問' || text.toLowerCase() === 'leave question') {
                await this.handleLeaveQuestion(context);
            } else if (context.activity.value) {
                // Handle adaptive card submission
                if (context.activity.value.action === 'approve' || context.activity.value.action === 'reject') {
                    await this.handleApprovalAction(context);
                } else if (context.activity.value.action === 'submit_question') {
                    await this.handleQuestionSubmit(context);
                } else {
                    await this.handleCardSubmit(context);
                }
            } else {
                // Unknown command
                await context.sendActivity('コマンドを認識できませんでした。\n\n利用可能なコマンド:\n- 「休暇申請」: 休暇申請フォームを表示\n- 「休暇の質問」: 休暇に関する質問を送信');
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
     * Initialize storage connection
     */
    async initializeStorage() {
        try {
            await this.conversationStorage.connect();
            console.log('[Bot] Conversation storage initialized');

            // Log storage stats
            const stats = await this.conversationStorage.getStats();
            console.log('[Bot] Storage stats:', JSON.stringify(stats, null, 2));
        } catch (error) {
            console.error('[Bot] Failed to initialize storage:', error);
            console.warn('[Bot] Will use in-memory fallback storage');
        }
    }

    /**
     * Store conversation reference for proactive messaging
     */
    async addConversationReference(activity) {
        try {
            const conversationReference = {
                activityId: activity.id,
                user: activity.from,
                bot: activity.recipient,
                conversation: activity.conversation,
                channelId: activity.channelId,
                serviceUrl: activity.serviceUrl
            };

            const userId = activity.from.id;

            // Store in Redis (with memory fallback)
            await this.conversationStorage.setConversationReference(userId, conversationReference);

            console.log('[addConversationReference] Stored reference for user:', userId);
            console.log('[addConversationReference] Service URL:', activity.serviceUrl);

            // Log storage stats
            const stats = await this.conversationStorage.getStats();
            console.log('[addConversationReference] Storage stats - Memory:', stats.memoryCount, 'Redis:', stats.redisCount);
        } catch (error) {
            console.error('[addConversationReference] Error storing conversation reference:', error);
        }
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
     * Handle leave question command
     */
    async handleLeaveQuestion(context) {
        try {
            console.log('[handleLeaveQuestion] Displaying question form');

            await context.sendActivity({
                attachments: [CardFactory.adaptiveCard(leaveQuestionCard)]
            });

        } catch (error) {
            console.error('[handleLeaveQuestion] Error:', error);
            await context.sendActivity('エラーが発生しました。もう一度お試しください。');
        }
    }

    /**
     * Get team members for approver selection
     */
    async getTeamMembersForSelection(context) {
        try {
            const conversationType = context.activity.conversation.conversationType;

            // For personal (1-on-1) chats, use stored approvers list from Redis
            if (conversationType === 'personal') {
                console.log('[getTeamMembersForSelection] Personal chat detected - retrieving stored approvers list');

                // Try to get stored approvers list from Redis
                const storedApprovers = await this.conversationStorage.getApproversList();

                if (storedApprovers && storedApprovers.length > 0) {
                    console.log('[getTeamMembersForSelection] Using stored approvers list -', storedApprovers.length, 'approvers');
                    return storedApprovers;
                } else {
                    console.warn('[getTeamMembersForSelection] No stored approvers list found');
                    console.warn('[getTeamMembersForSelection] Please use the bot in a Teams channel first to populate the approvers list');
                    return [];
                }
            }

            // For team/group chats, get members from the conversation
            console.log('[getTeamMembersForSelection] Team/group chat detected - retrieving members from conversation');
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
            const approversList = filteredMembers.map(member => ({
                title: member.name,
                value: JSON.stringify({
                    id: member.id,
                    name: member.name,
                    email: member.email || member.userPrincipalName
                })
            }));

            // Store this list in Redis for future use in personal chats
            if (approversList.length > 0) {
                console.log('[getTeamMembersForSelection] Storing approvers list for future use -', approversList.length, 'approvers');
                await this.conversationStorage.setApproversList(approversList);
            }

            return approversList;

        } catch (error) {
            console.error('[getTeamMembersForSelection] Error getting team members:', error);
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
     * Handle question answered from DevRev webhook
     */
    async handleQuestionAnswered(workItem) {
        try {
            console.log('[handleQuestionAnswered] Processing:', workItem.id);

            // Extract questioner Teams ID from body
            const body = workItem.body || '';
            const teamsIdMatch = body.match(/Teams User ID[:\s]*([^\n]+)/);

            if (!teamsIdMatch) {
                console.error('[handleQuestionAnswered] No Teams User ID found in issue body');
                console.error('[handleQuestionAnswered] Body:', body);
                return;
            }

            const questionerTeamsId = teamsIdMatch[1].trim();
            console.log('[handleQuestionAnswered] Questioner Teams ID:', questionerTeamsId);

            // Get conversation reference
            const conversationReference = await this.conversationStorage.getConversationReference(questionerTeamsId);

            if (!conversationReference) {
                console.error('[handleQuestionAnswered] No conversation reference found for questioner:', questionerTeamsId);
                const userIds = await this.conversationStorage.getAllUserIds();
                console.error('[handleQuestionAnswered] Available user IDs:', userIds);
                return;
            }

            console.log('[handleQuestionAnswered] Found conversation reference for questioner');

            // Extract question title and answer from latest comment or body
            const title = workItem.title || '質問';
            const displayId = workItem.display_id || workItem.id;

            // Create answer notification message
            const answerMessage = `📬 質問への回答が届きました！\n\n` +
                `**質問:** ${title.replace('休暇に関する質問: ', '')}\n` +
                `**Issue ID:** ${displayId}\n\n` +
                `DevRevで回答を確認してください: https://app.devrev.ai/work/${displayId}`;

            // Send notification to questioner
            await this.adapter.continueConversationAsync(
                process.env.MICROSOFT_APP_ID,
                conversationReference,
                async (turnContext) => {
                    await turnContext.sendActivity(answerMessage);
                    console.log('[handleQuestionAnswered] Answer notification sent to:', questionerTeamsId);
                }
            );

            console.log('[handleQuestionAnswered] Answer notification sent successfully');

        } catch (error) {
            console.error('[handleQuestionAnswered] Error:', error);
            console.error('[handleQuestionAnswered] Error stack:', error.stack);
            throw error;
        }
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

            console.log('[handleLeaveRequestCreated] Custom fields:', JSON.stringify(fields, null, 2));
            console.log('[handleLeaveRequestCreated] Approver Teams ID:', approverTeamsId);

            if (!approverTeamsId || approverTeamsId === '') {
                console.warn('[handleLeaveRequestCreated] No approver Teams ID found - approver_teams_id is empty or missing');
                console.warn('[handleLeaveRequestCreated] Approver name:', fields.tnt__approver_name || fields.approver_name);
                return;
            }

            // Check if we have a stored conversation reference for this approver
            const conversationReference = await this.conversationStorage.getConversationReference(approverTeamsId);

            if (!conversationReference) {
                console.error('[handleLeaveRequestCreated] No conversation reference found for approver:', approverTeamsId);

                // Get available user IDs for debugging
                const userIds = await this.conversationStorage.getAllUserIds();
                console.error('[handleLeaveRequestCreated] Available user IDs:', userIds);
                console.error('[handleLeaveRequestCreated] The approver must interact with the bot at least once before receiving proactive messages');
                return;
            }

            console.log('[handleLeaveRequestCreated] Found conversation reference for approver');
            console.log('[handleLeaveRequestCreated] Service URL from stored reference:', conversationReference.serviceUrl);

            // Create approval request card
            const approvalCard = this.createApprovalCard(workItem);

            // Use continueConversationAsync with stored conversation reference
            console.log('[handleLeaveRequestCreated] Sending proactive message using stored conversation reference');

            await this.adapter.continueConversationAsync(
                process.env.MICROSOFT_APP_ID,
                conversationReference,
                async (turnContext) => {
                    console.log('[handleLeaveRequestCreated] Inside conversation callback - sending approval card');
                    // Send the approval card
                    await turnContext.sendActivity({
                        attachments: [CardFactory.adaptiveCard(approvalCard)]
                    });
                    console.log('[handleLeaveRequestCreated] Approval request sent to:', approverTeamsId);
                }
            );

            console.log('[handleLeaveRequestCreated] Proactive message sent successfully');

        } catch (error) {
            console.error('[handleLeaveRequestCreated] Error:', error);
            console.error('[handleLeaveRequestCreated] Error stack:', error.stack);
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
            console.log(`[handleApprovalAction] Requester Teams ID:`, requesterTeamsId);
            console.log(`[handleApprovalAction] Requester Name:`, requesterName);

            // Update status in DevRev
            const newStatus = action === 'approve' ? 'approved' : 'rejected';
            console.log(`[handleApprovalAction] Updating status to:`, newStatus);

            await this.devRevService.updateLeaveRequestStatus(objectId, newStatus);
            console.log(`[handleApprovalAction] Status updated successfully in DevRev`);

            // Send confirmation to approver
            const actionText = action === 'approve' ? '承認' : '却下';
            await context.sendActivity(`✅ 休暇申請 ${displayId} を${actionText}しました。`);

            // Notify requester
            console.log(`[handleApprovalAction] Attempting to notify requester:`, requesterTeamsId);

            if (!requesterTeamsId) {
                console.error(`[handleApprovalAction] Requester Teams ID is missing - cannot send notification`);
                await context.sendActivity(`⚠️ 申請者への通知を送信できませんでした（Teams IDが見つかりません）`);
                return;
            }

            try {
                await this.notifyRequester(requesterTeamsId, requesterName, displayId, newStatus);
                console.log(`[handleApprovalAction] Requester notification sent successfully`);
                await context.sendActivity(`📧 申請者 ${requesterName} に結果を通知しました。`);
            } catch (notifyError) {
                console.error(`[handleApprovalAction] Failed to notify requester:`, notifyError);
                await context.sendActivity(`⚠️ 申請者への通知送信に失敗しました。申請者がBotと対話していない可能性があります。`);
            }

        } catch (error) {
            console.error('[handleApprovalAction] Error:', error);
            console.error('[handleApprovalAction] Error stack:', error.stack);
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

            // Check if we have a stored conversation reference for this requester
            const conversationReference = await this.conversationStorage.getConversationReference(requesterTeamsId);

            if (!conversationReference) {
                console.error('[notifyRequester] No conversation reference found for requester:', requesterTeamsId);

                // Get available user IDs for debugging
                const userIds = await this.conversationStorage.getAllUserIds();
                console.error('[notifyRequester] Available user IDs:', userIds);
                console.error('[notifyRequester] Cannot send notification - user has not interacted with bot');
                return;
            }

            console.log('[notifyRequester] Found conversation reference for requester');

            // Use continueConversationAsync with stored conversation reference
            await this.adapter.continueConversationAsync(
                process.env.MICROSOFT_APP_ID,
                conversationReference,
                async (turnContext) => {
                    await turnContext.sendActivity(
                        `${emoji} あなたの休暇申請（${displayId}）が${statusText}。`
                    );
                    console.log('[notifyRequester] Notification sent to:', requesterTeamsId);
                }
            );

        } catch (error) {
            console.error('[notifyRequester] Error:', error);
        }
    }

    /**
     * Handle question submission
     */
    async handleQuestionSubmit(context) {
        try {
            console.log('[handleQuestionSubmit] Handling question submission');
            const submittedData = context.activity.value;

            console.log('[handleQuestionSubmit] Submitted data:', JSON.stringify(submittedData, null, 2));

            // Validate question
            if (!submittedData.question || submittedData.question.trim() === '') {
                await context.sendActivity('質問内容を入力してください。');
                return;
            }

            // Send confirmation
            await context.sendActivity('質問を受け付けました。DevRevにIssueを作成しています...');

            // Create DevRev issue
            const questionData = {
                question: submittedData.question,
                category: submittedData.category || 'other'
            };

            const issueResult = await this.devRevService.createLeaveQuestion(
                questionData,
                context.activity.from
            );

            if (issueResult.success) {
                let confirmationMessage = `✅ 質問を送信しました！\n\n`;
                confirmationMessage += `**質問内容:** ${submittedData.question}\n\n`;

                if (issueResult.displayId) {
                    confirmationMessage += `**Issue ID:** ${issueResult.displayId}\n`;
                }

                if (issueResult.issueUrl) {
                    confirmationMessage += `**確認リンク:** ${issueResult.issueUrl}\n\n`;
                }

                confirmationMessage += `回答が届き次第、Teamsで通知します。`;

                await context.sendActivity(confirmationMessage);
            } else {
                await context.sendActivity(`❌ エラーが発生しました: ${issueResult.error}`);
            }

        } catch (error) {
            console.error('[handleQuestionSubmit] Error:', error);
            await context.sendActivity('送信中にエラーが発生しました。もう一度お試しください。');
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
                console.log('[handleCardSubmit] Parsed approver info:', approverInfo);
            } catch (error) {
                // If parsing fails, it might be a text input fallback
                console.log('[handleCardSubmit] Approver is not JSON, treating as text input');
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

            console.log('[handleCardSubmit] Approver details - Name:', submittedData.approverName, 'ID:', submittedData.approverUserId, 'Email:', submittedData.approverEmail);

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
