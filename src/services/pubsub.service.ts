interface NewRegistrationEmailMessage {
  crmProcess: 'newRegistrationEmail';  // lowercase 'n' as specified
  customer: {
    email: string;
  };
  metadata: {
    timestamp: number;
  };
}

type PubSubMessage = NewRegistrationEmailMessage | ResetPasswordRequestMessage;

class PubSubService {
  private pubsub: PubSub;
  private subscriptionName: string;

  constructor() {
    this.pubsub = new PubSub();
    const subscriptionName = process.env.PUBSUB_SUBSCRIPTION_NAME;
    if (!subscriptionName) {
      throw new Error('PUBSUB_SUBSCRIPTION_NAME environment variable is not set');
    }
    this.subscriptionName = subscriptionName;
  }

  async publishMessage(message: PubSubMessage): Promise<void> {
    try {
      const dataBuffer = Buffer.from(JSON.stringify(message));
      await this.pubsub.topic(this.subscriptionName).publish(dataBuffer);
      
      logger.info(`Published ${message.crmProcess} to PubSub`, {
        email: message.customer.email.replace(/(?<=.).(?=.*@)/g, '*'), // Log masked email
        timestamp: message.metadata.timestamp
      });
    } catch (error) {
      logger.error(`Failed to publish ${message.crmProcess} to PubSub`, { error });
      throw error;
    }
  }
}

export const pubSubService = new PubSubService(); 