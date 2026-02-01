# Reservation Check-in (預約簽到)

**Status:** Phase 1 Implemented  
**Design:** [DESIGN-RESERVATION-CHECK-IN.md](./DESIGN-RESERVATION-CHECK-IN.md)

**Description:** Implement a check-in system for reservations that allows customers to check in when they arrive at the store or event. The system uses QR code scanning or reservation code input to quickly complete check-in and confirmation, enabling paperless, automated, and efficient check-in processes. This replaces traditional manual check-in, reduces front desk workload, records attendance data, and provides real-time notifications.

**Phase 1 (done):** Check-in page `/s/[storeId]/checkin?rsvpId=xxx`, manual code input, status CheckedIn, checkedInAt timestamp, customer + store staff notifications. QR code generation in notifications and store admin can be added in Phase 2.

## Core Features

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

## Implementation Requirements

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

## Technical Requirements

- **QR Code Format**: Include reservation ID and store ID in QR code data
- **Security**: Validate QR codes to prevent unauthorized check-ins
- **Mobile Optimization**: Responsive design for mobile check-in interface
- **Real-time Updates**: Update reservation status immediately upon check-in
- **Integration Points**:
  - RSVP system (update reservation status)
  - Notification system (send confirmations)
  - Analytics system (track attendance)

## Related Components

- RSVP/Reservation system
- QR code generation library
- Mobile check-in interface
- Notification system (LINE, email)
- Analytics and reporting
- Store admin dashboard (check-in management)
