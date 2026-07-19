-- Add stripe_client_secret column to payments table
alter table payments
add column stripe_client_secret text;

-- Add index for faster lookups
create index idx_payments_stripe_client_secret on payments(stripe_client_secret);
