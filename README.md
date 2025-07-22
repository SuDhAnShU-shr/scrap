# ScrapPickup - Fully Functional Backend

This project now includes a complete backend implementation using Supabase Edge Functions. The backend provides comprehensive APIs for all aspects of the scrap pickup service.

## Backend Architecture

### Edge Functions

The backend is built using Supabase Edge Functions, providing serverless API endpoints:

1. **Authentication (`/functions/auth`)** - User registration, login, logout
2. **Orders (`/functions/orders`)** - Order management and tracking
3. **Payments (`/functions/payments`)** - Payment processing with Razorpay integration
4. **Materials (`/functions/materials`)** - Material pricing and catalog management
5. **Addresses (`/functions/addresses`)** - User address management
6. **Notifications (`/functions/notifications`)** - SMS, email, and push notifications
7. **Analytics (`/functions/analytics`)** - User statistics and reporting
8. **Webhooks (`/functions/webhooks`)** - External service webhook handling

### Key Features

#### 🔐 Authentication & Authorization
- JWT-based authentication using Supabase Auth
- Role-based access control (Customer, Admin, Driver, Support)
- Secure user registration and login
- Session management

#### 📦 Order Management
- Complete order lifecycle management
- Real-time order status updates
- Order history and tracking
- Bulk operations support

#### 💳 Payment Processing
- Razorpay integration for secure payments
- Payment verification and webhook handling
- Refund processing
- Payment history and receipts

#### 📊 Analytics & Reporting
- User statistics and insights
- Revenue tracking and reporting
- Material usage analytics
- Order performance metrics

#### 🔔 Notifications
- Multi-channel notifications (SMS, Email, Push)
- Order status updates
- Payment confirmations
- Pickup reminders

#### 🏠 Address Management
- Multiple address support
- Default address handling
- Address validation
- Pickup location management

### API Client

The frontend includes a comprehensive API client (`src/lib/api.ts`) that provides:

- Type-safe API calls
- Automatic authentication header handling
- Error handling and retry logic
- Request/response interceptors

### Custom Hooks

React hooks for easy API integration (`src/hooks/useApi.ts`):

- `useApi` - Generic API call hook with loading states
- `useAsyncAction` - For handling async actions
- `useOrders` - Order management
- `useMaterials` - Material catalog
- `useAddresses` - Address management
- `useUserStats` - Analytics and statistics

### Database Schema

The backend uses a comprehensive PostgreSQL schema with:

- **Users** - User profiles and authentication
- **Addresses** - Pickup locations
- **Material Prices** - Dynamic pricing catalog
- **Orders** - Order management
- **Order Items** - Order line items
- **Payments** - Payment tracking

### Security Features

- Row Level Security (RLS) on all tables
- JWT token validation
- Role-based permissions
- API rate limiting
- Input validation and sanitization
- CORS configuration

### Webhook Integration

Support for external service webhooks:

- **Razorpay** - Payment status updates
- **SMS Providers** - Delivery confirmations
- **Email Services** - Delivery tracking

### Environment Variables

Required environment variables:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

### Deployment

The Edge Functions are automatically deployed to Supabase and provide:

- Global CDN distribution
- Auto-scaling
- Built-in monitoring
- Zero cold starts

### API Endpoints

All endpoints follow RESTful conventions with action-based routing:

```
POST /functions/v1/auth
POST /functions/v1/orders
POST /functions/v1/payments
POST /functions/v1/materials
POST /functions/v1/addresses
POST /functions/v1/notifications
POST /functions/v1/analytics
POST /functions/v1/webhooks
```

### Error Handling

Comprehensive error handling with:

- Structured error responses
- HTTP status codes
- Detailed error messages
- Logging and monitoring

### Testing

The backend includes:

- Unit tests for business logic
- Integration tests for API endpoints
- Mock services for external dependencies
- Performance testing

This backend implementation provides a production-ready foundation for the ScrapPickup service with scalability, security, and maintainability in mind.