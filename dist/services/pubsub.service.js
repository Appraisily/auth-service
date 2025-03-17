"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pubSubService = exports.PubSubService = void 0;
const pubsub_1 = require("@google-cloud/pubsub");
const logger_1 = __importDefault(require("../utils/logger"));
class PubSubService {
    constructor() {
        this.pubsub = new pubsub_1.PubSub();
        const subscriptionName = process.env.PUBSUB_SUBSCRIPTION_NAME;
        if (!subscriptionName) {
            throw new Error('PUBSUB_SUBSCRIPTION_NAME environment variable is not set');
        }
        this.subscriptionName = subscriptionName;
    }
    async publishMessage(message) {
        try {
            const dataBuffer = Buffer.from(JSON.stringify(message));
            await this.pubsub.topic(this.subscriptionName).publish(dataBuffer);
            logger_1.default.info(`Published ${message.crmProcess} to PubSub`, {
                email: message.customer.email.replace(/(?<=.).(?=.*@)/g, '*'), // Log masked email
                timestamp: message.metadata.timestamp
            });
        }
        catch (error) {
            logger_1.default.error(`Failed to publish ${message.crmProcess} to PubSub`, { error });
            throw error;
        }
    }
}
exports.PubSubService = PubSubService;
// Export a singleton instance
exports.pubSubService = new PubSubService();
