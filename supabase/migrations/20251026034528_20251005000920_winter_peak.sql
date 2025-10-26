/*
  # Remove SendGrid Dependencies

  1. Database Changes
    - Drop contact notification trigger if exists
    - Drop notify_contact_submission function if exists
    - Clean up any SendGrid-related database objects

  2. Notes
    - This removes email notification functionality
    - Contact form will continue to work with WhatsApp integration
    - No data loss, only removes notification triggers
*/

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS contact_notification_trigger ON contact_messages;

-- Drop the function if it exists
DROP FUNCTION IF EXISTS notify_contact_submission();

-- Add a comment to track this change
COMMENT ON TABLE contact_messages IS 'Contact messages table - using WhatsApp integration for notifications';