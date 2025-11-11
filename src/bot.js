const { ActivityHandler, CardFactory, MessageFactory } = require('botbuilder');
const { DevRevService } = require('./services/devrev');
const leaveRequestCard = require('./cards/leaveRequestCard.json');

class TeamsLeaveBot extends ActivityHandler {
    constructor() {
        super();
        this.devRevService = new DevRevService();

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
                // Handle adaptive card submission
                await this.handleCardSubmit(context);
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

            // Get conversation type and approver
            const conversationType = context.activity.conversation.conversationType;
            let approverName = '';
            let approverUserId = '';

            // If it's a 1-on-1 chat, get the other person as approver
            if (conversationType === 'personal') {
                const members = await this.getConversationMembers(context);
                const otherMember = members.find(m => m.id !== context.activity.recipient.id);
                if (otherMember) {
                    approverName = otherMember.name;
                    approverUserId = otherMember.id;
                }
            }

            // Create adaptive card with pre-filled approver if available
            const card = this.createLeaveRequestCard(approverName, approverUserId);

            await context.sendActivity({
                attachments: [CardFactory.adaptiveCard(card)]
            });

        } catch (error) {
            console.error('Error in handleLeaveRequest:', error);
            await context.sendActivity('エラーが発生しました。もう一度お試しください。');
        }
    }

    /**
     * Get conversation members
     */
    async getConversationMembers(context) {
        try {
            const members = await context.adapter.getConversationMembers(context);
            return members;
        } catch (error) {
            console.error('Error getting conversation members:', error);
            return [];
        }
    }

    /**
     * Create leave request card with optional pre-filled approver
     */
    createLeaveRequestCard(approverName = '', approverUserId = '') {
        // Clone the template card
        const card = JSON.parse(JSON.stringify(leaveRequestCard));

        // If we have an approver, pre-fill the approver field
        if (approverName && approverUserId) {
            const approverInput = card.body.find(item =>
                item.type === 'Input.Text' && item.id === 'approver'
            );
            if (approverInput) {
                approverInput.value = approverName;
            }

            // Store the userId in a hidden field
            card.body.push({
                type: 'Input.Text',
                id: 'approverUserId',
                isVisible: false,
                value: approverUserId
            });
        }

        return card;
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
            if (!submittedData.startDate || !submittedData.endDate || !submittedData.reason) {
                await context.sendActivity('すべての必須フィールドを入力してください。');
                return;
            }

            // Send confirmation to user
            await context.sendActivity('休暇申請を受け付けました。DevRevチケットを作成しています...');

            // Create DevRev ticket
            const ticketResult = await this.devRevService.createLeaveRequestTicket(
                submittedData,
                context.activity.from
            );

            if (ticketResult.success) {
                const confirmationMessage = `✅ 休暇申請が完了しました！\n\n` +
                    `**DevRev Ticket:** ${ticketResult.ticketId}\n` +
                    `**休暇期間:** ${submittedData.startDate} ~ ${submittedData.endDate}\n` +
                    `**理由:** ${submittedData.reason}\n` +
                    `**有給利用:** ${submittedData.usePaidLeave === 'true' ? 'はい' : 'いいえ'}\n` +
                    `**承認者:** ${submittedData.approver || '未指定'}`;

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
