# BuildMyBot Webhook Integration Guide

## Overview

BuildMyBot webhooks allow you to subscribe to events happening in your account and receive real-time notifications via HTTP POST requests to your specified endpoint. This enables you to integrate BuildMyBot with thousands of third-party services like Zapier, Make.com (Integromat), or your own custom applications.

---

## Quick Start

1. **Navigate to Webhooks** in your BuildMyBot dashboard
2. **Click "Create Webhook"**
3. **Configure your webhook:**
   - Name: A friendly name for your webhook
   - Endpoint URL: The URL where you want to receive webhook events
   - Events: Select which events you want to subscribe to
4. **Save and copy your webhook secret** (you'll need this to verify webhook signatures)
5. **Test your webhook** using the built-in test feature

---

## Available Events

BuildMyBot supports the following webhook events:

### Lead Events
- `lead.created` - Triggered when a new lead is captured
- `lead.updated` - Triggered when a lead is updated
- `lead.status_changed` - Triggered when a lead's status changes

### Conversation Events
- `conversation.started` - Triggered when a conversation begins
- `conversation.ended` - Triggered when a conversation ends
- `conversation.message` - Triggered on each message (high volume)

### Bot Events
- `bot.created` - Triggered when a bot is created
- `bot.updated` - Triggered when a bot is updated
- `bot.deleted` - Triggered when a bot is deleted

### User Events
- `user.created` - Triggered when a user signs up
- `subscription.created` - Triggered when a subscription is created
- `subscription.updated` - Triggered when a subscription is updated
- `subscription.cancelled` - Triggered when a subscription is cancelled

### Wildcard
- `*` - Subscribe to all events

---

## Webhook Payload Structure

All webhook POST requests have the following structure:

```json
{
  "event": "lead.created",
  "data": {
    // Event-specific data
  },
  "timestamp": "2026-01-07T12:00:00.000Z",
  "organizationId": "org_123abc"
}
```

### Example Payloads

#### Lead Created
```json
{
  "event": "lead.created",
  "data": {
    "lead": {
      "id": "lead_123",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "score": 85,
      "status": "New",
      "sourceBotId": "bot_456",
      "createdAt": "2026-01-07T12:00:00.000Z"
    },
    "userId": "user_789"
  },
  "timestamp": "2026-01-07T12:00:00.000Z",
  "organizationId": "org_123abc"
}
```

#### Lead Status Changed
```json
{
  "event": "lead.status_changed",
  "data": {
    "lead": {
      "id": "lead_123",
      "name": "John Doe",
      "email": "john@example.com",
      "status": "Qualified"
    },
    "previousStatus": "New",
    "newStatus": "Qualified",
    "userId": "user_789"
  },
  "timestamp": "2026-01-07T12:00:00.000Z",
  "organizationId": "org_123abc"
}
```

#### Conversation Started
```json
{
  "event": "conversation.started",
  "data": {
    "conversation": {
      "id": "conv_123",
      "botId": "bot_456",
      "messages": [],
      "sentiment": "Neutral"
    },
    "userId": "user_789"
  },
  "timestamp": "2026-01-07T12:00:00.000Z",
  "organizationId": "org_123abc"
}
```

---

## HTTP Headers

BuildMyBot sends the following headers with each webhook request:

```
Content-Type: application/json
User-Agent: BuildMyBot-Webhooks/1.0
X-Webhook-Signature: sha256=<signature>
X-Webhook-Event: lead.created
X-Webhook-Delivery-ID: <unique-delivery-id>
X-Webhook-Timestamp: 2026-01-07T12:00:00.000Z
```

---

## Verifying Webhook Signatures

**IMPORTANT:** Always verify webhook signatures to ensure requests are genuinely from BuildMyBot.

### Signature Algorithm

BuildMyBot uses HMAC-SHA256 to sign webhook payloads. The signature is included in the `X-Webhook-Signature` header.

### Verification Steps

1. **Extract the signature** from the `X-Webhook-Signature` header
2. **Compute the HMAC** using your webhook secret and the raw request body
3. **Compare** the computed HMAC with the provided signature

### Example: Node.js/Express

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(req, webhookSecret) {
  const signature = req.headers['x-webhook-signature'];
  const rawBody = JSON.stringify(req.body);

  const hmac = crypto.createHmac('sha256', webhookSecret);
  hmac.update(rawBody);
  const expectedSignature = `sha256=${hmac.digest('hex')}`;

  // Use timing-safe comparison
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Express middleware
app.post('/webhooks/buildmybot', (req, res) => {
  const isValid = verifyWebhookSignature(req, process.env.WEBHOOK_SECRET);

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Process webhook
  const { event, data } = req.body;

  switch (event) {
    case 'lead.created':
      // Handle new lead
      break;
    case 'conversation.started':
      // Handle new conversation
      break;
    // ... more cases
  }

  res.status(200).json({ received: true });
});
```

### Example: Python/Flask

```python
import hmac
import hashlib

def verify_webhook_signature(request, webhook_secret):
    signature = request.headers.get('X-Webhook-Signature')
    raw_body = request.get_data(as_text=True)

    expected_signature = 'sha256=' + hmac.new(
        webhook_secret.encode(),
        raw_body.encode(),
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(signature, expected_signature)

@app.route('/webhooks/buildmybot', methods=['POST'])
def handle_webhook():
    if not verify_webhook_signature(request, os.environ['WEBHOOK_SECRET']):
        return jsonify({'error': 'Invalid signature'}), 401

    data = request.get_json()
    event = data.get('event')

    if event == 'lead.created':
        # Handle new lead
        pass

    return jsonify({'received': True}), 200
```

---

## Retry Logic

BuildMyBot automatically retries failed webhook deliveries using exponential backoff:

- **1st retry:** 1 minute after failure
- **2nd retry:** 5 minutes after failure
- **3rd retry:** 30 minutes after failure

You can configure the maximum number of retries (1-10) when creating your webhook.

### Successful Delivery

A webhook delivery is considered successful when your endpoint:
- Returns HTTP status code **200-299**
- Responds within **30 seconds**

### Failed Delivery

A delivery is marked as failed if:
- Your endpoint returns HTTP status **400+**
- The request times out (30 seconds)
- A network error occurs

---

## Best Practices

### 1. Respond Quickly
Your webhook endpoint should respond within 30 seconds. For long-running tasks, use a queue:

```javascript
app.post('/webhooks/buildmybot', async (req, res) => {
  // Verify signature
  if (!verifyWebhookSignature(req, webhookSecret)) {
    return res.status(401).send('Invalid signature');
  }

  // Acknowledge receipt immediately
  res.status(200).json({ received: true });

  // Process asynchronously
  await queue.add('process-webhook', req.body);
});
```

### 2. Handle Duplicate Events
Due to retries, you may receive the same event multiple times. Make your webhook handler idempotent:

```javascript
const processedDeliveries = new Set();

app.post('/webhooks/buildmybot', (req, res) => {
  const deliveryId = req.headers['x-webhook-delivery-id'];

  if (processedDeliveries.has(deliveryId)) {
    return res.status(200).json({ received: true, duplicate: true });
  }

  processedDeliveries.add(deliveryId);
  // Process webhook...
});
```

### 3. Always Verify Signatures
Never process webhook data without verifying the signature first.

### 4. Use HTTPS Endpoints
Always use HTTPS (not HTTP) for your webhook endpoints to ensure data security.

### 5. Monitor Webhook Health
Check the delivery history in your BuildMyBot dashboard to ensure webhooks are being delivered successfully.

---

## Zapier Integration

### Quick Setup

1. **In BuildMyBot:**
   - Create a new webhook
   - Subscribe to events you want to sync (e.g., `lead.created`)

2. **In Zapier:**
   - Create a new Zap
   - Choose **Webhooks by Zapier** as the trigger
   - Select **Catch Hook**
   - Copy the webhook URL

3. **Back in BuildMyBot:**
   - Paste the Zapier webhook URL
   - Test the webhook
   - Verify data appears in Zapier

4. **In Zapier:**
   - Continue building your Zap
   - Add actions (e.g., create Google Sheet row, send email, add to CRM)

### Example Zap Workflows

- **New Lead → Google Sheets:** Automatically add leads to a spreadsheet
- **New Lead → Slack:** Get notified in Slack when high-value leads are captured
- **Conversation Started → Email:** Send welcome email when conversation begins
- **Lead Status Changed → CRM:** Sync lead status with Salesforce/HubSpot

---

## Make.com (Integromat) Integration

### Quick Setup

1. **In Make.com:**
   - Create a new scenario
   - Add **Webhooks** → **Custom Webhook** module
   - Copy the webhook URL

2. **In BuildMyBot:**
   - Create a new webhook
   - Paste the Make.com URL
   - Subscribe to desired events
   - Test the webhook

3. **In Make.com:**
   - Run the scenario once to capture sample data
   - Add modules to process the data
   - Activate your scenario

---

## Custom Integration Examples

### Send to Slack

```javascript
app.post('/webhooks/buildmybot', async (req, res) => {
  if (!verifyWebhookSignature(req, webhookSecret)) {
    return res.status(401).send('Invalid signature');
  }

  const { event, data } = req.body;

  if (event === 'lead.created') {
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `New lead captured: ${data.lead.name} (${data.lead.email})`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*New Lead:* ${data.lead.name}\n*Email:* ${data.lead.email}\n*Score:* ${data.lead.score}`
            }
          }
        ]
      })
    });
  }

  res.status(200).json({ received: true });
});
```

### Save to Database

```javascript
app.post('/webhooks/buildmybot', async (req, res) => {
  if (!verifyWebhookSignature(req, webhookSecret)) {
    return res.status(401).send('Invalid signature');
  }

  const { event, data } = req.body;

  if (event === 'lead.created') {
    await db.leads.create({
      buildmybot_id: data.lead.id,
      name: data.lead.name,
      email: data.lead.email,
      phone: data.lead.phone,
      score: data.lead.score,
      source: 'buildmybot',
      created_at: data.lead.createdAt
    });
  }

  res.status(200).json({ received: true });
});
```

---

## Troubleshooting

### Webhooks Not Delivering

**Check:**
- Is your endpoint URL correct and accessible?
- Is your endpoint using HTTPS?
- Does your endpoint respond within 30 seconds?
- Are you returning a 2xx status code?

**Debug:**
- View delivery history in the BuildMyBot dashboard
- Check error messages in failed deliveries
- Use the "Retry" button to manually retry failed deliveries

### Signature Verification Failing

**Common issues:**
- Body parsing: Make sure you're using the raw request body, not parsed JSON
- Secret mismatch: Verify you're using the correct webhook secret
- Header format: Extract only the signature value, not the entire header

### High Volume Events

If subscribed to `conversation.message` or other high-volume events:
- Use a queue system (Redis, RabbitMQ, SQS)
- Consider batch processing
- Implement rate limiting on your endpoint

---

## API Reference

### List Webhooks
```
GET /api/webhooks
```

### Create Webhook
```
POST /api/webhooks
Content-Type: application/json

{
  "name": "My Webhook",
  "url": "https://example.com/webhook",
  "events": ["lead.created", "lead.updated"],
  "description": "Optional description",
  "enabled": true,
  "retryEnabled": true,
  "maxRetries": 3
}
```

### Update Webhook
```
PUT /api/webhooks/:id
Content-Type: application/json

{
  "name": "Updated Name",
  "enabled": false
}
```

### Delete Webhook
```
DELETE /api/webhooks/:id
```

### Get Delivery History
```
GET /api/webhooks/:id/deliveries?limit=50
```

### Test Webhook
```
POST /api/webhooks/:id/test
```

### Retry Failed Delivery
```
POST /api/webhooks/deliveries/:deliveryId/retry
```

### Regenerate Secret
```
POST /api/webhooks/:id/regenerate-secret
```

---

## Support

Need help with webhooks?

- **Documentation:** This guide
- **Dashboard:** View delivery logs and debug issues
- **Support:** support@buildmybot.app

---

## Changelog

### v1.0 (January 2026)
- Initial webhook system release
- Support for lead, conversation, and bot events
- Automatic retry with exponential backoff
- HMAC-SHA256 signature verification
- Zapier and Make.com integration guides
