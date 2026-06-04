using MimeKit;
using MailKitClient = MailKit.Net.Smtp.SmtpClient;

namespace OnlineExamPortal.API.Services
{
    public interface IEmailService
    {
        Task SendResultEmail(string toEmail, string studentName, string examTitle, int score, int totalMarks, decimal percentage, bool isPassed);
        Task SendWelcomeEmail(string toEmail, string studentName);
    }

    public class EmailService : IEmailService
    {
        private readonly IConfiguration _configuration;

        public EmailService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public async Task SendResultEmail(string toEmail, string studentName, string examTitle, int score, int totalMarks, decimal percentage, bool isPassed)
        {
            try
            {
                var email = new MimeMessage();
                email.From.Add(MailboxAddress.Parse(_configuration["Email:From"]));
                email.To.Add(MailboxAddress.Parse(toEmail));
                email.Subject = $"Your Exam Result: {examTitle}";

                var statusColor = isPassed ? "#28a745" : "#dc3545";
                var statusText = isPassed ? "PASSED ✅" : "FAILED ❌";

                var body = $@"
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset='utf-8'>
                    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
                    <title>Exam Result</title>
                    <style>
                        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                        .header {{ background: linear-gradient(135deg, #4361ee, #3a0ca3); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                        .content {{ background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }}
                        .result-card {{ background: white; padding: 20px; border-radius: 10px; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
                        .score {{ font-size: 24px; font-weight: bold; color: #4361ee; }}
                        .status {{ font-size: 20px; font-weight: bold; color: {statusColor}; }}
                        .footer {{ text-align: center; margin-top: 20px; font-size: 12px; color: #888; }}
                        hr {{ border: none; border-top: 1px solid #e9ecef; margin: 20px 0; }}
                    </style>
                </head>
                <body>
                    <div class='container'>
                        <div class='header'>
                            <h1>📊 Online Examination Portal</h1>
                        </div>
                        <div class='content'>
                            <h2>Hello {studentName},</h2>
                            <p>You have successfully completed the exam: <strong>{examTitle}</strong>.</p>
                            
                            <div class='result-card'>
                                <h3>Your Results:</h3>
                                <table style='width: 100%;'>
                                    <tr>
                                        <td><strong>Score:</strong></td>
                                        <td class='score'>{score}/{totalMarks}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Percentage:</strong></td>
                                        <td><strong>{percentage}%</strong></td>
                                    </tr>
                                    <tr>
                                        <td><strong>Status:</strong></td>
                                        <td class='status'>{statusText}</td>
                                    </tr>
                                </table>
                            </div>
                            
                            <p>You can view your detailed results by logging into the portal.</p>
                            <hr>
                            <p>Thank you for taking the exam!</p>
                        </div>
                        <div class='footer'>
                            <p>This is an automated message from Online Examination Portal. Please do not reply to this email.</p>
                            <p>&copy; 2026 Online Examination Portal. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
                ";

                email.Body = new TextPart("html") { Text = body };

                using (var client = new MailKitClient())
                {
                    await client.ConnectAsync(_configuration["Email:SmtpServer"], int.Parse(_configuration["Email:SmtpPort"]), false);
                    await client.AuthenticateAsync(_configuration["Email:Username"], _configuration["Email:Password"]);
                    await client.SendAsync(email);
                    await client.DisconnectAsync(true);
                }

                Console.WriteLine($"Email sent to {toEmail}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Email sending failed: {ex.Message}");
            }
        }

        public async Task SendWelcomeEmail(string toEmail, string studentName)
        {
            try
            {
                var email = new MimeMessage();
                email.From.Add(MailboxAddress.Parse(_configuration["Email:From"]));
                email.To.Add(MailboxAddress.Parse(toEmail));
                email.Subject = "Welcome to Online Examination Portal";

                var body = $@"
                <html>
                <body style='font-family: Arial, sans-serif;'>
                    <div style='max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;'>
                        <h2 style='color: #4361ee;'>Welcome to Online Examination Portal!</h2>
                        <h3>Hello {studentName},</h3>
                        <p>Your account has been successfully created.</p>
                        <p>You can now login and start taking exams.</p>
                        <p><strong>Your Login Credentials:</strong></p>
                        <ul>
                            <li>Email: {toEmail}</li>
                            <li>Password: [Your chosen password]</li>
                        </ul>
                        <p>Thank you for joining us!</p>
                        <hr>
                        <p style='font-size: 12px; color: #888;'>Online Examination Portal</p>
                    </div>
                </body>
                </html>
                ";

                email.Body = new TextPart("html") { Text = body };

                using (var client = new MailKitClient())
                {
                    await client.ConnectAsync(_configuration["Email:SmtpServer"], int.Parse(_configuration["Email:SmtpPort"]), false);
                    await client.AuthenticateAsync(_configuration["Email:Username"], _configuration["Email:Password"]);
                    await client.SendAsync(email);
                    await client.DisconnectAsync(true);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Welcome email failed: {ex.Message}");
            }
        }
    }
}