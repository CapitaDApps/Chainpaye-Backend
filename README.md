# Chainpaye-Backend

ChainPaye, for Seamless cross-border payments through WhatsApp powered by Toronet blockchain. Send money between US and Nigeria instantly with PIN-protected wallets, bank integration, and multi-currency support (ToroUSD/ToroNGN). Built with Node.js, TypeScript, MongoDB, and WhatsApp Business API.

## Features

- 🔗 **Payment Link Generation**: Create secure payment links for transactions
- 💳 **Multi-Currency Support**: NGN, USD, GBP, EUR with appropriate payment methods
- 🔄 **Background Verification**: Automatic payment verification every 5 minutes for 24 hours
- 📧 **Email Notifications**: Confirmation and expiration emails with HTML templates
- 🪝 **Webhook Integration**: Merchant notifications via success URLs
- 📊 **Transaction Management**: Complete transaction lifecycle with state management
- 🛡️ **Rate Limiting**: Comprehensive rate limiting for API protection
- 📝 **Audit Trail**: Complete audit logging for all operations
- 🌐 **CORS Support**: Configurable cross-origin resource sharing

## Background Verification System

The system includes an automated background verification service that:

- ✅ Monitors PENDING transactions every 5 minutes
- ✅ Verifies payments with Toronet API
- ✅ Sends email notifications on confirmation/expiration
- ✅ Triggers merchant webhooks when payments are confirmed
- ✅ Automatically expires transactions after 24 hours
- ✅ Provides comprehensive audit logging

See [BACKGROUND_VERIFICATION.md](BACKGROUND_VERIFICATION.md) for detailed documentation.
