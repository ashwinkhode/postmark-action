import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as core from '@actions/core';
import * as main from '../src/main';

const mockSendEmail = vi.fn();
const mockServerClientInstance = {
  sendEmail: mockSendEmail
};

// Mock dependencies
vi.mock('fs/promises');
vi.mock('handlebars');

// Mock postmark with a proper factory function
vi.mock('postmark', () => ({
  ServerClient: vi.fn().mockImplementation(() => mockServerClientInstance)
}));

// Mock dependencies
vi.mock('fs/promises');
vi.mock('handlebars');

// Mock the GitHub Actions core library
vi.mock('@actions/core');

describe('Input Validation', () => {
  const validInputs = {
    'postmark-token': 'test-token',
    to: 'test@example.com',
    from: 'sender@example.com',
    subject: 'Test Subject',
    body: 'Test Body',
    'is-html': false,
    'template-path': '',
    'template-data': ''
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Setup default mock implementations
    vi.mocked(core.getInput).mockImplementation(
      (name: string) => validInputs[name] || ''
    );
    vi.mocked(core.getBooleanInput).mockImplementation((name: string) =>
      Boolean(validInputs[name])
    );
  });

  it('should fail when postmark token is missing', async () => {
    vi.mocked(core.getInput).mockImplementation((name: string) =>
      name === 'postmark-token' ? '' : validInputs[name]
    );

    await main.run();
    expect(core.setFailed).toHaveBeenCalledWith('Postmark token is required');
  });

  it('should fail with invalid recipient email', async () => {
    vi.mocked(core.getInput).mockImplementation((name: string) =>
      name === 'to' ? 'invalid-email' : validInputs[name]
    );

    await main.run();
    expect(core.setFailed).toHaveBeenCalledWith(
      'Valid recipient email is required'
    );
  });

  it('should fail with invalid sender email', async () => {
    vi.mocked(core.getInput).mockImplementation((name: string) =>
      name === 'from' ? 'invalid-email' : validInputs[name]
    );

    await main.run();
    expect(core.setFailed).toHaveBeenCalledWith(
      'Valid sender email is required'
    );
  });

  it('should fail when both template path and body are missing', async () => {
    vi.mocked(core.getInput).mockImplementation((name: string) =>
      name === 'body' ? '' : validInputs[name]
    );

    await main.run();
    expect(core.setFailed).toHaveBeenCalledWith(
      'Either template path or email body is required'
    );
  });
});

describe('Postmark Email Action', () => {
  let mockServerClient: typeof mockServerClientInstance;
  const defaultInputs = {
    'postmark-token': 'test-token',
    to: 'test@example.com',
    from: 'sender@example.com',
    subject: 'Test Subject',
    body: 'Test Body',
    'template-path': '',
    'template-data': '',
    'is-html': false
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup core input mocks
    vi.mocked(core.getInput).mockImplementation(
      (name: string) => defaultInputs[name] || ''
    );
    vi.mocked(core.getBooleanInput).mockImplementation((name: string) =>
      Boolean(defaultInputs[name])
    );

    mockServerClient = mockServerClientInstance;
  });

  describe('run()', () => {
    const mockSuccessResponse = {
      ErrorCode: 0,
      Message: 'OK',
      MessageID: 'test-message-id',
      SubmittedAt: '2024-12-21T17:04:09.4948172Z',
      To: 'test@example.com'
    };

    it('should successfully send a plain text email', async () => {
      // Setup success response
      mockServerClient.sendEmail.mockResolvedValue(mockSuccessResponse);

      await main.run();

      expect(mockServerClient.sendEmail).toHaveBeenCalledTimes(1);
      expect(mockServerClient.sendEmail).toHaveBeenCalledWith({
        To: defaultInputs.to,
        From: defaultInputs.from,
        Subject: defaultInputs.subject,
        TextBody: defaultInputs.body
      });

      expect(core.setOutput).toHaveBeenCalledWith('status', 'success');
      expect(core.setFailed).not.toHaveBeenCalled();
    });

    it('should successfully send an HTML email', async () => {
      const htmlInputs = { ...defaultInputs, 'is-html': true };
      vi.mocked(core.getBooleanInput).mockImplementation((name: string) =>
        Boolean(htmlInputs[name])
      );

      mockServerClient.sendEmail.mockResolvedValue(mockSuccessResponse);

      await main.run();

      expect(mockServerClient.sendEmail).toHaveBeenCalledWith({
        To: htmlInputs.to,
        From: htmlInputs.from,
        Subject: htmlInputs.subject,
        HtmlBody: htmlInputs.body
      });
    });

    it('should handle Postmark API errors', async () => {
      const apiError = new Error('Postmark API Error');
      mockServerClient.sendEmail.mockRejectedValue(apiError);

      await main.run();

      expect(core.setFailed).toHaveBeenCalledWith(
        'Failed to send email: Postmark API Error'
      );
      expect(core.setOutput).not.toHaveBeenCalled();
    });
  });

  describe('EmailService', () => {
    // TODO: fix this test case
    it.skip('should initialize with custom config options', () => {
      const configOptions = { useHTTPS: true, timeout: 30 };
      new main.EmailService('test-token', configOptions);

      expect(mockServerClient).toHaveBeenCalledWith(
        'test-token',
        configOptions
      );
    });

    it('should handle successful email sending', async () => {
      const emailService = new main.EmailService('test-token');
      const mockResponse = {
        ErrorCode: 0,
        Message: 'OK',
        SubmittedAt: new Date().toISOString(),
        MessageID: 'aklsdj-asdljasd-asldkjasd-asdlkj'
      };

      mockServerClient.sendEmail.mockResolvedValue(mockResponse);

      const emailParams = {
        To: 'test@example.com',
        From: 'sender@example.com',
        Subject: 'Test',
        TextBody: 'Test'
      };

      const result = await emailService.sendEmail(emailParams);

      expect(result).toEqual(true);
      expect(mockServerClient.sendEmail).toHaveBeenCalledWith(emailParams);
    });

    it('should properly propagate errors', async () => {
      const emailService = new main.EmailService('test-token');
      const error = new Error('API Error');

      mockServerClient.sendEmail.mockRejectedValue(error);

      await expect(
        emailService.sendEmail({
          To: 'test@example.com',
          From: 'sender@example.com',
          Subject: 'Test',
          TextBody: 'Test'
        })
      ).rejects.toThrow('API Error');
    });
  });
});

// describe('TemplateProcessor', () => {
//   let processor: main.TemplateProcessor;
//   const TEMPLATE_PATH = '../templates/test.html';

//   beforeEach(() => {
//     vi.clearAllMocks();
//     processor = new main.TemplateProcessor();
//   });

//   describe('loadTemplate', () => {
//     it('should load and compile template successfully', async () => {
//       const templateContent = 'Hello {{name}}!';
//       vi.mocked(fs.readFile).mockResolvedValue(templateContent);

//       await processor.loadTemplate(TEMPLATE_PATH);
//       const result = processor.processTemplate({ name: 'John' });

//       expect(result).toBe('Hello John!');
//       expect(fs.readFile).toHaveBeenCalledWith(TEMPLATE_PATH, 'utf-8');
//     });

//     it('should throw error when file read fails', async () => {
//       vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));

//       await expect(processor.loadTemplate(TEMPLATE_PATH))
//         .rejects.toThrow('Failed to load template: File not found');
//     });
//   });

//   describe('processTemplate', () => {
//     it('should throw error when template not loaded', () => {
//       expect(() => processor.processTemplate({ name: 'John' }))
//         .toThrow('Template not loaded');
//     });

//     it('should process template with valid data', async () => {
//       const templateContent = 'Hello {{name}}!';
//       vi.mocked(fs.readFile).mockResolvedValue(templateContent);

//       await processor.loadTemplate(TEMPLATE_PATH);
//       const result = processor.processTemplate({ name: 'John' });

//       expect(result).toBe('Hello John!');
//     });
//   });

//   describe('registerHelpers', () => {
//     beforeEach(() => {
//       // Reset Handlebars helpers before each test
//       Handlebars.helpers = {};
//       main.TemplateProcessor.registerHelpers();
//     });

//     it('should register formatDate helper', async () => {
//       const templateContent = '{{formatDate date}}';
//       vi.mocked(fs.readFile).mockResolvedValue(templateContent);

//       await processor.loadTemplate(TEMPLATE_PATH);
//       const result = processor.processTemplate({
//         date: new Date('2024-01-01')
//       });

//       expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
//     });

//     it('should register uppercase helper', async () => {
//       const templateContent = '{{uppercase text}}';
//       vi.mocked(fs.readFile).mockResolvedValue(templateContent);

//       await processor.loadTemplate(TEMPLATE_PATH);
//       const result = processor.processTemplate({ text: 'hello' });

//       expect(result).toBe('HELLO');
//     });

//     it('should register lowercase helper', async () => {
//       const templateContent = '{{lowercase text}}';
//       vi.mocked(fs.readFile).mockResolvedValue(templateContent);

//       await processor.loadTemplate(TEMPLATE_PATH);
//       const result = processor.processTemplate({ text: 'HELLO' });

//       expect(result).toBe('hello');
//     });

//     it('should register conditional helper', async () => {
//       const templateContent = '{{conditional isActive "Active" "Inactive"}}';
//       vi.mocked(fs.readFile).mockResolvedValue(templateContent);

//       await processor.loadTemplate(TEMPLATE_PATH);

//       const activeResult = processor.processTemplate({ isActive: true });
//       expect(activeResult).toBe('Active');

//       const inactiveResult = processor.processTemplate({ isActive: false });
//       expect(inactiveResult).toBe('Inactive');
//     });
//   });
// });
