/**
 * VYAVSAYMITRA — Notification Provider Integration Adapter
 * Phase 12: Multi-Channel Notification Orchestration & Integrations
 * 
 * Supports channel abstractions: IN_APP, EMAIL, SMS, WHATSAPP.
 * Never claims external delivery unless provider explicitly confirms.
 * For unconfigured channels, deterministically returns:
 *   { available: false, reason: "PROVIDER_NOT_CONFIGURED", delivered: false }
 */

const nodemailer = require('nodemailer');

class NotificationProvider {
  constructor(config = {}) {
    this.emailConfig = {
      host: process.env.SMTP_HOST || config.smtpHost || null,
      port: process.env.SMTP_PORT || config.smtpPort || null,
      user: process.env.SMTP_USER || config.smtpUser || null,
      pass: process.env.SMTP_PASS || config.smtpPass || null,
      from: process.env.SMTP_FROM || 'no-reply@vyavsaymitra.in'
    };

    this.smsConfig = {
      apiKey: process.env.SMS_GATEWAY_KEY || config.smsApiKey || null,
      senderId: process.env.SMS_SENDER_ID || 'VYAVSY'
    };

    this.whatsappConfig = {
      apiKey: process.env.WHATSAPP_API_KEY || config.whatsappApiKey || null,
      businessPhoneNumberId: process.env.WHATSAPP_PHONE_ID || null
    };

    this.initTransporter();
  }

  initTransporter() {
    if (this.emailConfig.host && this.emailConfig.user && this.emailConfig.pass) {
      try {
        this.emailTransporter = nodemailer.createTransport({
          host: this.emailConfig.host,
          port: parseInt(this.emailConfig.port || '587', 10),
          secure: this.emailConfig.port === '465',
          auth: {
            user: this.emailConfig.user,
            pass: this.emailConfig.pass
          }
        });
      } catch (err) {
        this.emailTransporter = null;
      }
    } else {
      this.emailTransporter = null;
    }
  }

  getChannelStatus(channel) {
    const ch = (channel || '').toUpperCase();
    switch (ch) {
      case 'IN_APP':
        return { channel: 'IN_APP', available: true, status: 'READY' };
      case 'EMAIL':
        return {
          channel: 'EMAIL',
          available: Boolean(this.emailTransporter),
          status: this.emailTransporter ? 'CONFIGURED' : 'NOT_CONFIGURED'
        };
      case 'SMS':
        return {
          channel: 'SMS',
          available: Boolean(this.smsConfig.apiKey),
          status: this.smsConfig.apiKey ? 'CONFIGURED' : 'NOT_CONFIGURED'
        };
      case 'WHATSAPP':
        return {
          channel: 'WHATSAPP',
          available: Boolean(this.whatsappConfig.apiKey),
          status: this.whatsappConfig.apiKey ? 'CONFIGURED' : 'NOT_CONFIGURED'
        };
      default:
        return { channel: ch, available: false, status: 'UNSUPPORTED_CHANNEL' };
    }
  }

  getAllChannelStatuses() {
    return {
      IN_APP: this.getChannelStatus('IN_APP'),
      EMAIL: this.getChannelStatus('EMAIL'),
      SMS: this.getChannelStatus('SMS'),
      WHATSAPP: this.getChannelStatus('WHATSAPP')
    };
  }

  async send({ channel, recipient, content = {} }) {
    const ch = (channel || '').toUpperCase();
    if (ch === 'EMAIL') {
      return this.sendEmail({
        to: recipient,
        subject: content.subject || 'Notification',
        text: content.text || content.body || '',
        html: content.html
      });
    }
    if (ch === 'SMS') {
      return this.sendSms({
        phone: recipient,
        message: content.message || content.body || ''
      });
    }
    if (ch === 'WHATSAPP') {
      return this.sendWhatsApp({
        phone: recipient,
        templateName: content.templateName,
        parameters: content.parameters
      });
    }
    return {
      delivered: false,
      available: false,
      status: 'NOT_CONFIGURED',
      reason: 'PROVIDER_NOT_CONFIGURED',
      channel: ch
    };
  }

  async sendEmail({ to, subject, html, text }) {
    if (!this.emailTransporter) {
      return {
        delivered: false,
        available: false,
        status: 'NOT_CONFIGURED',
        reason: 'PROVIDER_NOT_CONFIGURED',
        channel: 'EMAIL'
      };
    }

    try {
      const info = await this.emailTransporter.sendMail({
        from: this.emailConfig.from,
        to,
        subject,
        text,
        html
      });
      return {
        delivered: true,
        available: true,
        status: 'DELIVERED',
        channel: 'EMAIL',
        messageId: info.messageId
      };
    } catch (err) {
      return {
        delivered: false,
        available: true,
        status: 'FAILED',
        channel: 'EMAIL',
        reason: err.message
      };
    }
  }

  async sendSms({ phone, message }) {
    if (!this.smsConfig.apiKey) {
      return {
        delivered: false,
        available: false,
        status: 'NOT_CONFIGURED',
        reason: 'PROVIDER_NOT_CONFIGURED',
        channel: 'SMS'
      };
    }
    // In production, integrate with SMS gateway (e.g. CDAC/NIC, Twilio, MSG91)
    return {
      delivered: false,
      available: false,
      status: 'NOT_CONFIGURED',
      reason: 'PROVIDER_NOT_CONFIGURED',
      channel: 'SMS'
    };
  }

  async sendWhatsApp({ phone, templateName, parameters }) {
    if (!this.whatsappConfig.apiKey) {
      return {
        delivered: false,
        available: false,
        status: 'NOT_CONFIGURED',
        reason: 'PROVIDER_NOT_CONFIGURED',
        channel: 'WHATSAPP'
      };
    }
    // In production, integrate with Meta Cloud API for WhatsApp
    return {
      delivered: false,
      available: false,
      status: 'NOT_CONFIGURED',
      reason: 'PROVIDER_NOT_CONFIGURED',
      channel: 'WHATSAPP'
    };
  }
}

const defaultNotificationProvider = new NotificationProvider();

module.exports = {
  NotificationProvider,
  defaultNotificationProvider
};
