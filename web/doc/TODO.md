# TODO

This document tracks planned features/improvements, and bugs.

## Bugs

1. when anonymous user create rsvp, entered phone number that match with existing user and paid be account balance. The rsvp does not show in rsvp/history after payment.

1. cannot receive sms (review provider)
1. line message as flex template

## Features

### Customer Invite

allow store admin to invite particular email/phone number to sign up

### Reservation Check-in (預約簽到)

**Status:** Not Started

**Description:** Implement a check-in system for reservations that allows customers to check in when they arrive at the store or event. The system uses QR code scanning or reservation code input to quickly complete check-in and confirmation, enabling paperless, automated, and efficient check-in processes. This replaces traditional manual check-in, reduces front desk workload, records attendance data, and provides real-time notifications.

#### Core Features

1. **Self-Service QR Code Check-in**
   - Customers scan QR code from their mobile device when arriving
   - System automatically updates attendance status
   - Real-time status updates

2. **Reservation Management**
   - Backend management of all reservations
   - Real-time updates and customer notifications
   - Status tracking (checked-in, no-show, cancelled)

3. **Automation & Integration**
   - Integration with LINE or other messaging systems
   - Automatic sending of reservation confirmation and check-in links
   - Automated notifications
   - Include the QR code in all notification (e-mail, LINE, etc)

4. **Data Tracking**
   - Record member attendance rates
   - Track service usage statistics
   - Analytics and reporting for management

5. **Enhanced Customer Experience**
   - Faster entry process
   - Improved customer arrival experience
   - Reduced waiting time

#### Implementation Requirements

- **QR Code Generation**: Generate unique QR codes for each reservation
- **Check-in Interface**:
  - Mobile-friendly check-in page
  - QR code scanner (camera-based)
  - Manual reservation code input option
- **Status Management**:
  - Update RSVP status to "checked-in" upon successful check-in
  - Record check-in timestamp
  - Handle duplicate check-in attempts
- **Notifications**:
  - Send check-in confirmation to customer
  - Notify store staff of customer arrival
  - Integration with LINE notifications
- **Analytics**:
  - Track check-in rates
  - Monitor no-show rates
  - Generate attendance reports

#### Technical Requirements

- **QR Code Format**: Include reservation ID and store ID in QR code data
- **Security**: Validate QR codes to prevent unauthorized check-ins
- **Mobile Optimization**: Responsive design for mobile check-in interface
- **Real-time Updates**: Update reservation status immediately upon check-in
- **Integration Points**:
  - RSVP system (update reservation status)
  - Notification system (send confirmations)
  - Analytics system (track attendance)

#### Related Components

- RSVP/Reservation system
- QR code generation library
- Mobile check-in interface
- Notification system (LINE, email)
- Analytics and reporting
- Store admin dashboard (check-in management)

### Product Management

### Service Staff Products

**Status:** Not Started

**Description:** Design a way to create a product for service staff. For example, "網球課10H" (tennis lessons 10 hours), which will allow customers to purchase 10 hours of service.

**Requirements:**

- Create a product type specifically for service staff
- Product should be associated with a service staff member
- Product should define a quantity of service hours/minutes (e.g., 10 hours)
- Customers should be able to purchase these products
- System should track remaining service hours after purchase
- Product creation interface for store administrators

**Related Components:**

- Product management system
- Service staff management
- Order/payment system
- Customer credit/service ledger

### Connect to external service

#### Google Map Reservation

#### Google calendar

### Business Analytics & Charts

**Status:** Planning

**Description:** Additional business analytics charts and visualizations for the store admin dashboard to provide deeper insights into business performance, customer behavior, and operational efficiency.

#### High Priority (Quick Wins)

#### 1. Revenue Trend Chart

- **Type:** Line/Area Chart
- **Description:** Daily/Weekly/Monthly revenue over time with period comparison
- **Features:**
  - Compare current period vs previous period
  - Show growth percentage
  - Toggle between daily/weekly/monthly views
- **Data Source:** StoreLedger entries grouped by day/week/month
- **Status:** Not Started

#### 2. Peak Hours Analysis

- **Type:** Line Chart
- **Description:** RSVPs/revenue by hour of day to identify busiest hours
- **Features:**
  - Hourly breakdown (0-23)
  - RSVP count and revenue overlay
  - Helps with staffing and scheduling decisions
- **Data Source:** RSVPs grouped by hour from rsvpTime
- **Status:** Not Started

#### 3. Facility Utilization Heatmap

- **Type:** Heatmap
- **Description:** Facility usage by day of week and hour
- **Features:**
  - Day of week (Mon-Sun) vs Hour of day (0-23)
  - Color intensity shows usage frequency
  - Identifies peak times for each facility
- **Data Source:** RSVPs grouped by facilityId, rsvpTime (day/hour)
- **Status:** Not Started

#### Medium Priority (Valuable Insights)

#### 4. Top Customers Chart

- **Type:** Bar Chart / Table
- **Description:** Top 10 customers by revenue and RSVP count
- **Features:**
  - Top customers by revenue
  - Top customers by RSVP count
  - Shows VIP customers
  - Click to view customer details
- **Data Source:** RSVPs aggregated by customerId
- **Status:** Not Started

#### 5. Service Staff Performance

- **Type:** Bar Chart
- **Description:** Revenue and RSVP count per service staff member
- **Features:**
  - Revenue per service staff
  - RSVP count per service staff
  - Average revenue per RSVP by staff
  - Performance comparison
- **Data Source:** RSVPs grouped by serviceStaffId
- **Status:** Not Started

#### 6. Day of Week Performance

- **Type:** Bar Chart
- **Description:** Revenue/RSVPs by day of week
- **Features:**
  - Shows which days are busiest
  - Helps with staffing and scheduling
  - Revenue and RSVP count overlay
- **Data Source:** RSVPs grouped by day of week from rsvpTime
- **Status:** Not Started

#### 7. Revenue by Payment Method

- **Type:** Pie/Donut Chart
- **Description:** Breakdown of revenue by payment method
- **Features:**
  - Shows which payment methods are most popular
  - Percentage and absolute values
  - Payment methods: Line Pay, Stripe, Cash, etc.
- **Data Source:** StoreLedger with PaymentMethod relation
- **Status:** Not Started

#### 8. Facility Revenue Comparison

- **Type:** Bar Chart
- **Description:** Revenue comparison across facilities
- **Features:**
  - Shows which facilities are most profitable
  - Revenue per facility
  - RSVP count per facility
- **Data Source:** RSVPs with facilityCost aggregated by facilityId
- **Status:** Not Started

#### Lower Priority (Nice to Have)

#### 9. Customer Acquisition & Retention

- **Type:** Line/Bar Chart
- **Description:** New customers per month and retention metrics
- **Features:**
  - New customers per month
  - Returning vs new customers ratio
  - Customer lifetime value (CLV) trend
- **Data Source:** RSVPs grouped by customerId, first RSVP date
- **Status:** Not Started

#### 10. RSVP Status Distribution

- **Type:** Pie Chart
- **Description:** Breakdown of RSVP statuses
- **Features:**
  - Completed, Ready, Cancelled, No Show
  - Shows completion rate
  - Percentage breakdown
- **Data Source:** RSVPs grouped by status
- **Status:** Not Started

#### 11. Cancellation Rate Trend

- **Type:** Line Chart
- **Description:** Cancellation rate over time
- **Features:**
  - Helps identify issues
  - Trend analysis
  - Period comparison
- **Data Source:** Cancelled RSVPs / Total RSVPs per period
- **Status:** Not Started

#### 12. Average Order Value (AOV) Trend

- **Type:** Line Chart
- **Description:** Average order value over time
- **Features:**
  - Helps identify pricing trends
  - Period comparison
  - Growth indicators
- **Data Source:** Revenue / Order count per period
- **Status:** Not Started

#### 13. Revenue vs Costs Breakdown

- **Type:** Stacked Area Chart
- **Description:** Revenue, Facility Costs, Service Staff Costs, Net Profit
- **Features:**
  - Shows profitability
  - Cost breakdown visualization
  - Net profit calculation
- **Data Source:** StoreLedger (revenue) vs RSVP costs (facilityCost, serviceStaffCost)
- **Status:** Not Started

#### 14. Period Comparison Chart

- **Type:** Side-by-Side Bar Chart
- **Description:** Compare current period vs previous period
- **Features:**
  - Current month vs previous month
  - Current year vs previous year
  - Shows growth/decline percentages
- **Data Source:** Monthly stats with period comparison
- **Status:** Not Started

#### 15. Customer Credit Usage

- **Type:** Line/Area Chart
- **Description:** Unused credit balance over time
- **Features:**
  - Credit top-ups vs usage
  - Unused credit trend
  - Credit utilization rate
- **Data Source:** CustomerCreditLedger entries
- **Status:** Not Started

#### 16. No-Show Rate Analysis

- **Type:** Bar Chart
- **Description:** No-show rate by facility or service staff
- **Features:**
  - Helps identify patterns
  - Facility-specific no-show rates
  - Service staff-specific no-show rates
- **Data Source:** RSVPs with No Show status
- **Status:** Not Started

#### 17. Payment Status Distribution

- **Type:** Pie Chart
- **Description:** Paid, Unpaid, Refunded orders breakdown
- **Features:**
  - Shows cash flow status
  - Payment status percentages
  - Quick overview of payment health
- **Data Source:** StoreOrders grouped by paymentStatus
- **Status:** Not Started

#### 18. Refund Analysis

- **Type:** Line/Bar Chart
- **Description:** Refund amount and count over time
- **Features:**
  - Refund trends
  - Refund reasons (if tracked)
  - Refund rate analysis
- **Data Source:** StoreOrders with refundAmount > 0
- **Status:** Not Started

#### 19. Facility vs Service Staff Revenue

- **Type:** Dual-Axis Chart
- **Description:** Compare facility revenue vs service staff revenue
- **Features:**
  - Shows which generates more revenue
  - Side-by-side comparison
  - Revenue source analysis
- **Data Source:** RSVPs aggregated by facilityCost vs serviceStaffCost
- **Status:** Not Started

#### Advanced Analytics (Future)

#### 20. Customer Segmentation (RFM Analysis)

- **Type:** Table/Chart
- **Description:** RFM analysis (Recency, Frequency, Monetary)
- **Features:**
  - Segment customers into groups (VIP, Regular, New, At-Risk)
  - Customer lifetime value calculation
  - Targeted marketing insights
- **Data Source:** Customer RSVP history and spending
- **Status:** Not Started

#### 21. Revenue Forecast/Prediction

- **Type:** Line Chart with Forecast
- **Description:** Revenue forecast for next month/quarter
- **Features:**
  - Based on historical trends
  - Simple moving average or trend analysis
  - Confidence intervals
- **Data Source:** Historical monthly stats
- **Status:** Not Started

#### Implementation Notes

- All charts should follow the existing pattern:
  - Use SWR for data fetching
  - Use i18n for all text labels
  - Follow mobile optimization guidelines
  - Use shadcn/ui chart components
  - Support year/period selection where applicable

- Data fetching pattern:
  - Create server actions in `web/src/actions/`
  - Create API routes in `web/src/app/api/storeAdmin/[storeId]/`
  - Use SWR in client components
  - Transform BigInt/Decimal for JSON serialization

- Chart components location:
  - `web/src/app/storeAdmin/(dashboard)/[storeId]/(routes)/dashboard/components/`
  - Follow naming: `chart-[type]-[feature].tsx`
