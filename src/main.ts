import * as fs from 'fs/promises';
import Handlebars from 'handlebars';
import * as core from '@actions/core';
import { ServerClient } from 'postmark';
import { ClientOptions, Message } from 'postmark/dist/client/models'; // Types

interface EmailPayload extends Message {}

export interface ActionInputs {
  postmarkToken: string;
  to: string;
  from: string;
  subject: string;
  body: string;
  isHtml: boolean;
  templatePath?: string;
  templateData?: string;
}

type TemplateData = { [key: string]: unknown };

// Input validator
// biome-ignore lint/complexity/noStaticOnlyClass: Validation logic is simple
export class InputValidator {
  static validate(inputs: ActionInputs): void {
    if (!inputs.postmarkToken) {
      throw new Error('Postmark token is required');
    }

    if (!inputs.to || !InputValidator.isValidEmail(inputs.to)) {
      throw new Error('Valid recipient email is required');
    }

    if (!inputs.from || !InputValidator.isValidEmail(inputs.from)) {
      throw new Error('Valid sender email is required');
    }

    if (!inputs.subject) {
      throw new Error('Email subject is required');
    }

    if (inputs.templatePath && !inputs.templateData) {
      throw new Error('Template data is required when using a template');
    }

    if (!inputs.templatePath && !inputs.body) {
      throw new Error('Either template path or email body is required');
    }
  }

  static validateTemplateData(data: string): TemplateData {
    try {
      return JSON.parse(data);
    } catch (_error) {
      throw new Error('Template data must be valid JSON');
    }
  }

  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

// Template processor class
export class TemplateProcessor {
  private template: HandlebarsTemplateDelegate | null = null;

  async loadTemplate(templatePath: string): Promise<void> {
    try {
      const templateContent = await fs.readFile(templatePath, 'utf-8');
      this.template = Handlebars.compile(templateContent);
    } catch (error) {
      throw new Error(
        `Failed to load template: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  processTemplate(data: TemplateData): string {
    if (!this.template) {
      throw new Error('Template not loaded');
    }

    try {
      return this.template(data);
    } catch (error) {
      throw new Error(
        `Failed to process template: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  // Register custom helpers
  static registerHelpers(): void {
    Handlebars.registerHelper('formatDate', (date: Date) =>
      new Date(date).toLocaleDateString()
    );

    Handlebars.registerHelper('uppercase', (str: string) => str.toUpperCase());

    Handlebars.registerHelper('lowercase', (str: string) => str.toLowerCase());

    Handlebars.registerHelper(
      'conditional',
      (condition: boolean, positive: string, negative: string) =>
        condition ? positive : negative
    );
  }
}

export class EmailService {
  private client: ServerClient;

  constructor(
    serverToken: string,
    configOptions?: ClientOptions.Configuration
  ) {
    this.client = new ServerClient(serverToken, configOptions);
  }

  async sendEmail(payload: EmailPayload) {
    try {
      const response = await this.client.sendEmail(payload);

      return response.ErrorCode === 0;
    } catch (error) {
      throw new Error(
        `Failed to send email: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    // Get inputs
    const inputs: ActionInputs = {
      postmarkToken: core.getInput('postmark-token', { required: true }),
      to: core.getInput('to', { required: true }),
      from: core.getInput('from', { required: true }),
      subject: core.getInput('subject', { required: true }),
      body: core.getInput('body', { required: false }),
      isHtml: core.getBooleanInput('is-html', { required: true }),
      templatePath: core.getInput('template-path', { required: false }),
      templateData: core.getInput('template-data', { required: false })
    };

    // Validate inputs
    InputValidator.validate(inputs);

    let body = inputs.body;

    if (inputs.templatePath && inputs.templateData) {
      const templateData = InputValidator.validateTemplateData(
        inputs.templateData
      );
      const templateProcessor = new TemplateProcessor();
      await templateProcessor.loadTemplate(inputs.templatePath);
      body = templateProcessor.processTemplate(templateData);
    }

    // Initialize service and send email
    const emailService = new EmailService(inputs.postmarkToken);
    const success = await emailService.sendEmail({
      To: inputs.to,
      From: inputs.from,
      Subject: inputs.subject,
      [inputs.isHtml ? 'HtmlBody' : 'TextBody']: body
    });

    if (success) {
      core.setOutput('status', 'success');
    } else {
      throw new Error('Failed to send email');
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message);
  }
}

// function readTemplateAndSendMail() {}
