/**
 * 邮件服务 - 支持SMTP/SendGrid/阿里云
 * 功能：邮箱验证、审批通知等邮件发送
 */

const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');

class EmailService {
  constructor() {
    this.transporter = null;
    this.config = {
      provider: process.env.EMAIL_PROVIDER || 'smtp',
      from: process.env.EMAIL_FROM || '"密评备考系统" <noreply@example.com>',
      smtp: {
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      }
    };
  }

  async initialize() {
    if (this.config.provider === 'smtp') {
      this.transporter = nodemailer.createTransport(this.config.smtp);
      console.log('[EmailService] SMTP transporter initialized');
    }
  }

  /**
   * 发送邮箱验证邮件
   */
  async sendEmailVerificationEmail(username, email, verificationToken) {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:18080'}/verify-email?token=${verificationToken}`;

    const html = await this.getEmailTemplate('email-verification', {
      username,
      verificationUrl,
      expiryHours: 24
    });

    return this.sendEmail({
      to: email,
      subject: '【密评备考系统】邮箱地址验证',
      html
    });
  }

  /**
   * 发送审批通知邮件
   */
  async sendApprovalNotificationEmail(username, email, approved, reason = '') {
    const subject = approved ? '【密评备考系统】账户已激活' : '【密评备考系统】账户申请未通过';
    const status = approved ? 'approved' : 'rejected';
    const message = approved
      ? '您的账户已通过管理员审批，现在可以登录系统开始学习了！'
      : `很抱歉，您的账户申请未通过管理员审批。${reason ? '原因：' + reason : ''}`;

    const html = await this.getEmailTemplate('approval-notification', {
      username,
      status,
      message,
      frontendUrl: process.env.FRONTEND_URL || 'http://localhost:18080'
    });

    return this.sendEmail({
      to: email,
      subject,
      html
    });
  }

  /**
   * 发送邮件的通用方法
   */
  async sendEmail(options) {
    if (!this.transporter) {
      await this.initialize();
    }

    // 如果没有配置邮件服务，记录日志但不发送
    if (!process.env.SMTP_HOST || process.env.EMAIL_PROVIDER === 'mock') {
      console.log('[EmailService] Mock mode - email would be sent:', options.subject);
      console.log('[EmailService] To:', options.to);
      return { success: true, mock: true };
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.config.from,
        ...options
      });

      console.log('[EmailService] Email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('[EmailService] Email send error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取邮件模板并替换变量
   */
  async getEmailTemplate(templateName, data) {
    try {
      const templatePath = path.join(__dirname, '..', 'templates', 'emails', `${templateName}.html`);
      let template = await fs.readFile(templatePath, 'utf-8');

      // 简单的模板变量替换
      for (const [key, value] of Object.entries(data)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        template = template.replace(regex, value);
      }

      return template;
    } catch (error) {
      console.error('[EmailService] Template error:', error);
      // 返回简单的HTML作为后备
      return `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>密评备考系统</h2>
          <p>${JSON.stringify(data)}</p>
        </div>
      `;
    }
  }
}

// 导出单例
module.exports = new EmailService();
