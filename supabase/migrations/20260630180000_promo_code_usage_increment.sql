-- Create function to increment promo code usage
create or replace function increment_promo_code_usage(code_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update promo_codes
  set times_used = times_used + 1
  where id = code_id;
end;
$$;

-- Grant execute permission
grant execute on function increment_promo_code_usage(uuid) to authenticated, anon;
