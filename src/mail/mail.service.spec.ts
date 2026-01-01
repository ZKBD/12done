import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';
import * as fs from 'fs';
import { MailService } from './mail.service';

// Mock SendGrid
jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn().mockResolvedValue([{ statusCode: 202 }]),
}));

// Mock fs
jest.mock('fs');

describe('MailService', () => {
  let service: MailService;

  const mockConfig: Record<string, string | number | null> = {
    'mail.from': 'test@12done.com',
    'mail.host': 'smtp.test.com',
    'mail.port': 587,
    'mail.user': 'apikey',
    'mail.pass': 'SG.test-api-key', // SendGrid API key format
    'app.frontendUrl': 'https://12done.com',
  };

  beforeEach(async () => {
    // Reset mocks completely
    jest.clearAllMocks();

    // Reset SendGrid mock to default success behavior
    (sgMail.send as jest.Mock).mockResolvedValue([{ statusCode: 202 }]);

    // Setup mock template
    (fs.readFileSync as jest.Mock).mockReturnValue(
      '<html><body>Hello {{firstName}}, {{verificationUrl}}</body></html>',
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfig[key]),
          },
        },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('constructor', () => {
    it('should set SendGrid API key when provided', () => {
      expect(sgMail.setApiKey).toHaveBeenCalledWith('SG.test-api-key');
    });

    it('should not set API key when not starting with SG.', async () => {
      jest.clearAllMocks();

      const configWithoutSendGrid: Record<string, string | number | null> = {
        'mail.from': 'test@12done.com',
        'mail.host': 'smtp.test.com',
        'mail.port': 587,
        'mail.user': 'testuser',
        'mail.pass': 'regular-password', // Not a SendGrid key
        'app.frontendUrl': 'https://12done.com',
      };

      await Test.createTestingModule({
        providers: [
          MailService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => configWithoutSendGrid[key]),
            },
          },
        ],
      }).compile();

      expect(sgMail.setApiKey).not.toHaveBeenCalled();
    });

    it('should use default values when config not provided', async () => {
      jest.clearAllMocks();

      const testModule = await Test.createTestingModule({
        providers: [
          MailService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(() => undefined),
            },
          },
        ],
      }).compile();

      const testService = testModule.get<MailService>(MailService);
      expect(testService).toBeDefined();
    });
  });

  describe('sendMail', () => {
    it('should send email successfully', async () => {
      await service.sendMail({
        to: 'user@example.com',
        subject: 'Test Subject',
        template: 'verification',
        context: { firstName: 'John', verificationUrl: 'https://example.com' },
      });

      expect(sgMail.send).toHaveBeenCalledWith({
        from: {
          email: 'test@12done.com',
          name: '12done.com',
        },
        to: 'user@example.com',
        subject: 'Test Subject',
        html: expect.any(String),
      });
    });

    it('should include frontendUrl and year in template context', async () => {
      (fs.readFileSync as jest.Mock).mockReturnValue(
        '<html>{{frontendUrl}} - {{year}}</html>',
      );

      await service.sendMail({
        to: 'user@example.com',
        subject: 'Test',
        template: 'test',
        context: {},
      });

      expect(sgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('https://12done.com'),
        }),
      );
    });

    it('should throw error when sendMail fails', async () => {
      (sgMail.send as jest.Mock).mockRejectedValue(new Error('SMTP error'));

      await expect(
        service.sendMail({
          to: 'user@example.com',
          subject: 'Test',
          template: 'test',
          context: {},
        }),
      ).rejects.toThrow('SMTP error');
    });

    it('should use fallback template when template not found', async () => {
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('File not found');
      });

      await service.sendMail({
        to: 'user@example.com',
        subject: 'Test',
        template: 'nonexistent',
        context: { content: 'Test content' },
      });

      expect(sgMail.send).toHaveBeenCalled();
    });

    it('should skip sending when SendGrid is not configured', async () => {
      jest.clearAllMocks();

      const configWithoutSendGrid: Record<string, string | number | null> = {
        'mail.from': 'test@12done.com',
        'mail.pass': null,
        'app.frontendUrl': 'https://12done.com',
      };

      const module = await Test.createTestingModule({
        providers: [
          MailService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => configWithoutSendGrid[key]),
            },
          },
        ],
      }).compile();

      const unconfiguredService = module.get<MailService>(MailService);

      await unconfiguredService.sendMail({
        to: 'user@example.com',
        subject: 'Test',
        template: 'test',
        context: {},
      });

      expect(sgMail.send).not.toHaveBeenCalled();
    });
  });

  describe('sendVerificationEmail', () => {
    it('should send verification email with correct parameters', async () => {
      await service.sendVerificationEmail(
        'user@example.com',
        'John',
        'verification-token-123',
      );

      expect(sgMail.send).toHaveBeenCalledWith({
        from: {
          email: 'test@12done.com',
          name: '12done.com',
        },
        to: 'user@example.com',
        subject: 'Verify your email - 12done.com',
        html: expect.any(String),
      });
    });

    it('should include verification URL with token', async () => {
      // Use triple braces to prevent HTML encoding in test template
      (fs.readFileSync as jest.Mock).mockReturnValue('{{{verificationUrl}}}');

      await service.sendVerificationEmail(
        'user@example.com',
        'John',
        'my-token',
      );

      expect(sgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('https://12done.com/auth/verify-email?token=my-token'),
        }),
      );
    });

    it('should include firstName in template context', async () => {
      (fs.readFileSync as jest.Mock).mockReturnValue('Hello {{firstName}}');

      await service.sendVerificationEmail(
        'user@example.com',
        'Jane',
        'token',
      );

      expect(sgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('Jane'),
        }),
      );
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email with correct parameters', async () => {
      await service.sendWelcomeEmail('user@example.com', 'John');

      expect(sgMail.send).toHaveBeenCalledWith({
        from: {
          email: 'test@12done.com',
          name: '12done.com',
        },
        to: 'user@example.com',
        subject: 'Welcome to 12done.com!',
        html: expect.any(String),
      });
    });

    it('should include login URL', async () => {
      (fs.readFileSync as jest.Mock).mockReturnValue('{{loginUrl}}');

      await service.sendWelcomeEmail('user@example.com', 'John');

      expect(sgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('https://12done.com/auth/login'),
        }),
      );
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email with correct parameters', async () => {
      await service.sendPasswordResetEmail(
        'user@example.com',
        'John',
        'reset-token-123',
      );

      expect(sgMail.send).toHaveBeenCalledWith({
        from: {
          email: 'test@12done.com',
          name: '12done.com',
        },
        to: 'user@example.com',
        subject: 'Reset your password - 12done.com',
        html: expect.any(String),
      });
    });

    it('should include reset URL with token', async () => {
      // Use triple braces to prevent HTML encoding in test template
      (fs.readFileSync as jest.Mock).mockReturnValue('{{{resetUrl}}}');

      await service.sendPasswordResetEmail(
        'user@example.com',
        'John',
        'reset-token-abc',
      );

      expect(sgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('https://12done.com/auth/reset-password?token=reset-token-abc'),
        }),
      );
    });
  });

  describe('sendInvitationEmail', () => {
    it('should send invitation email with correct parameters', async () => {
      await service.sendInvitationEmail(
        'newuser@example.com',
        'John Doe',
        'invitation-token-123',
      );

      expect(sgMail.send).toHaveBeenCalledWith({
        from: {
          email: 'test@12done.com',
          name: '12done.com',
        },
        to: 'newuser@example.com',
        subject: 'John Doe invited you to 12done.com',
        html: expect.any(String),
      });
    });

    it('should include invitation URL with token', async () => {
      // Use triple braces to prevent HTML encoding in test template
      (fs.readFileSync as jest.Mock).mockReturnValue('{{{invitationUrl}}}');

      await service.sendInvitationEmail(
        'newuser@example.com',
        'Jane',
        'inv-token-xyz',
      );

      expect(sgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('https://12done.com/auth/register?invitation=inv-token-xyz'),
        }),
      );
    });

    it('should include inviter name in subject and body', async () => {
      (fs.readFileSync as jest.Mock).mockReturnValue('{{inviterName}} invited you');

      await service.sendInvitationEmail(
        'newuser@example.com',
        'Alice Smith',
        'token',
      );

      expect(sgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Alice Smith invited you to 12done.com',
          html: expect.stringContaining('Alice Smith'),
        }),
      );
    });
  });

  describe('sendSearchAgentMatchEmail', () => {
    it('should send search agent match email with correct parameters', async () => {
      await service.sendSearchAgentMatchEmail(
        'user@example.com',
        'John',
        'Budapest Apartments',
        5,
        '/search?agentId=123',
      );

      expect(sgMail.send).toHaveBeenCalledWith({
        from: {
          email: 'test@12done.com',
          name: '12done.com',
        },
        to: 'user@example.com',
        subject: 'New matches for "Budapest Apartments" - 12done.com',
        html: expect.any(String),
      });
    });

    it('should include all context variables', async () => {
      // Use triple braces for searchUrl to prevent HTML encoding of query params
      (fs.readFileSync as jest.Mock).mockReturnValue(
        '{{firstName}} - {{searchAgentName}} - {{matchCount}} - {{{searchUrl}}}',
      );

      await service.sendSearchAgentMatchEmail(
        'user@example.com',
        'Jane',
        'My Search',
        10,
        '/search?id=456',
      );

      const callArgs = (sgMail.send as jest.Mock).mock.calls[0][0];
      expect(callArgs.html).toContain('Jane');
      expect(callArgs.html).toContain('My Search');
      expect(callArgs.html).toContain('10');
      expect(callArgs.html).toContain('/search?id=456');
    });

    it('should handle singular match count', async () => {
      await service.sendSearchAgentMatchEmail(
        'user@example.com',
        'John',
        'Vienna Houses',
        1,
        '/search',
      );

      expect(sgMail.send).toHaveBeenCalled();
    });
  });

  describe('template loading', () => {
    it('should try multiple paths to find template', async () => {
      let callCount = 0;
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          throw new Error('File not found');
        }
        return '<html>Found on third try</html>';
      });

      await service.sendMail({
        to: 'user@example.com',
        subject: 'Test',
        template: 'test',
        context: {},
      });

      expect(fs.readFileSync).toHaveBeenCalledTimes(3);
    });

    it('should compile template with handlebars', async () => {
      (fs.readFileSync as jest.Mock).mockReturnValue(
        '<p>Hello {{name}}, your code is {{code}}</p>',
      );

      await service.sendMail({
        to: 'user@example.com',
        subject: 'Test',
        template: 'test',
        context: { name: 'Bob', code: '12345' },
      });

      expect(sgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('Hello Bob'),
        }),
      );
      expect(sgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('12345'),
        }),
      );
    });
  });

  describe('error handling', () => {
    it('should log error and rethrow when email fails', async () => {
      const error = new Error('Connection refused');
      (sgMail.send as jest.Mock).mockRejectedValue(error);

      await expect(
        service.sendVerificationEmail('user@example.com', 'John', 'token'),
      ).rejects.toThrow('Connection refused');
    });

    it('should handle template compilation errors gracefully', async () => {
      (fs.readFileSync as jest.Mock).mockReturnValue('{{#if invalid');

      // Handlebars should throw on invalid template
      await expect(
        service.sendMail({
          to: 'user@example.com',
          subject: 'Test',
          template: 'invalid',
          context: {},
        }),
      ).rejects.toThrow();
    });
  });
});
