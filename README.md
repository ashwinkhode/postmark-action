# Postmark Action

A GitHub Action to send emails using the Postmark API with support for HTML templates.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

This action allows you to send emails through Postmark's API directly from your GitHub Actions workflow. It supports both plain text and HTML emails, with the ability to use template files and dynamic template variables.

## Features

- Send plain text or HTML emails
- Support for HTML template files
- Dynamic template variable substitution
- Simple integration with GitHub Actions workflows

## Requirements

- A Postmark account and API token (sign up at [postmarkapp.com](https://postmarkapp.com))
- Node.js 22 (handled automatically by GitHub Actions)
- Sender email address must be verified with Postmark

## Usage

### Basic Example (Plain Text)

```yaml
steps:
- name: Send Email
  uses: ashwinkhode/postmark-action@v1
  with:
    postmark-token: ${{ secrets.POSTMARK_TOKEN }}
    to: 'recipient@example.com'
    from: 'sender@yourdomain.com'
    subject: 'Test Email'
    body: 'This is a test email sent from GitHub Actions!'
    is-html: 'false'
```

### HTML Email Example

```yaml
steps:
- name: Send HTML Email
  uses: ashwinkhode/postmark-action@v1
  with:
    postmark-token: ${{ secrets.POSTMARK_TOKEN }}
    to: 'recipient@example.com'
    from: 'sender@yourdomain.com'
    subject: 'HTML Test Email'
    body: '<h1>Hello!</h1><p>This is an HTML email.</p>'
    is-html: 'true'
```

### Using Template Example

```yaml
steps:
- name: Send Templated Email
  uses: ashwinkhode/postmark-action@v1
  with:
    postmark-token: ${{ secrets.POSTMARK_TOKEN }}
    to: 'recipient@example.com'
    from: 'sender@yourdomain.com'
    subject: 'Templated Email'
    template-path: './email-templates/welcome.html'
    template-data: '{"name": "John", "company": "Acme Inc"}'
    is-html: 'true'
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `postmark-token` | Your Postmark API token | Yes | - |
| `to` | Recipient email address | Yes | - |
| `from` | Sender email address | Yes | - |
| `subject` | Email subject | Yes | - |
| `body` | Email body content | No* | - |
| `template-path` | Path to the HTML template file | No | - |
| `template-data` | JSON string containing template variables | No | - |
| `is-html` | Whether the body content is HTML | Yes | - |

\* `body` is required unless using a template

[Rest of the README remains the same...]

## Outputs

| Output | Description |
|--------|-------------|
| `status` | Status of the email sending operation |

## Template Variables

When using a template file, you can pass variables using the `template-data` input. The variables can come from multiple sources:

### 1. Static Values

```yaml
template-data: '{"username": "John", "resetLink": "https://example.com/reset"}'
```

### 2. GitHub Context Variables

You can use any GitHub Actions context variables in your template data:

```yaml
steps:
- name: Send Workflow Notification
  uses: ashwinkhode/postmark-action@v1
  with:
    # ... other inputs ...
    template-data: |
      {
        "repository": "${{ github.repository }}",
        "workflow": "${{ github.workflow }}",
        "actor": "${{ github.actor }}",
        "commit": "${{ github.sha }}",
        "ref": "${{ github.ref }}",
        "event": "${{ github.event_name }}"
      }
```

### 3. Environment Variables

```yaml
env:
  DEPLOY_ENV: production
  VERSION: 1.0.0

steps:
- name: Send Deploy Notification
  uses: ashwinkhode/postmark-action@v1
  with:
    # ... other inputs ...
    template-data: |
      {
        "environment": "${{ env.DEPLOY_ENV }}",
        "version": "${{ env.VERSION }}"
      }
```

### 4. Previous Step Outputs

```yaml
steps:
- name: Get Test Results
  id: tests
  run: |
    echo "::set-output name=passed::42"
    echo "::set-output name=failed::3"

- name: Send Test Report
  uses: ashwinkhode/postmark-action@v1
  with:
    # ... other inputs ...
    template-data: |
      {
        "testsPassed": "${{ steps.tests.outputs.passed }}",
        "testsFailed": "${{ steps.tests.outputs.failed }}"
      }
```

### Using Variables in Templates

In your template file, use double curly braces to reference variables:

```html
<h1>Workflow Report</h1>
<p>Repository: {{repository}}</p>
<p>Triggered by: {{actor}}</p>
<p>Environment: {{environment}}</p>
<p>Test Results:</p>
<ul>
  <li>Passed: {{testsPassed}}</li>
  <li>Failed: {{testsFailed}}</li>
</ul>
```

### Dynamic Subject Lines

You can also use GitHub context variables in the subject line:

```yaml
subject: 'Build ${{ github.run_number }} - ${{ job.status }} on ${{ github.repository }}'
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Author

Ashwin Khode ([@ashwin4real](https://twitter.com/ashwin4real))

## Support

- For issues with this Action: [Open an issue](https://github.com/ashwinkhode/postmark-action/issues)
- For API questions: [Postmark's API Documentation](https://postmarkapp.com/developer/api/overview)

## Credits

This project uses:
- [Postmark API](https://postmarkapp.com/developer)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Node.js](https://nodejs.org/)
- [handlebars](https://handlebarsjs.com/)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Legal Notice

This GitHub Action is an independent, unofficial integration and is not affiliated with, endorsed by, or connected to Postmark® or Wildbit LLC. Postmark® is a registered trademark of Wildbit LLC.

This Action uses Postmark's public API. For official resources:
- [Postmark Documentation](https://postmarkapp.com/developer)
- [API Reference](https://postmarkapp.com/developer/api/overview)
- [Terms of Service](https://postmarkapp.com/terms-of-service)

The MIT License applies only to the code in this repository and not to Postmark's services or API. Users must comply with [Postmark's Terms of Service](https://postmarkapp.com/terms-of-service) and [Sender Policy](https://postmarkapp.com/support/article/1047-how-to-request-sender-signature-approval).

---

*Note: This Action is maintained independently. For official Postmark integrations, visit [postmarkapp.com](https://postmarkapp.com).*
