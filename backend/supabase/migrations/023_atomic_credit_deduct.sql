-- ============================================
-- Atomic credit deduction
-- ============================================
-- Fixes a get-then-update race in credit.service.ts where two concurrent chat
-- requests both read balance=N and both write N-1, letting a user spend more
-- than they have (double-spend). A single conditional UPDATE is atomic at the
-- row level, so concurrent callers serialize correctly.

create or replace function public.deduct_credit(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_balance integer;
begin
  update public.user_credits
     set balance = balance - 1,
         updated_at = now()
   where user_id = p_user_id
     and balance > 0
  returning balance into new_balance;

  -- No row updated → either the user has no credits row, or balance was 0.
  -- Return -1 to signal "insufficient credits" without raising (the caller maps
  -- this to a 403). NULL (no FOUND) and 0-balance both fall through to here.
  if not found then
    return -1;
  end if;

  return new_balance;
end;
$$;
