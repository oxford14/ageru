# Reseller system acceptance (manual)

1. **Signup → reseller**: Register a new email → lands on `/reseller/dashboard`, profile role `reseller`.
2. **Super admin login**: Owner email → `/dashboard`; panel orders still work.
3. **Cross-zone block**: Reseller cannot open `/dashboard` (redirect to reseller home).
4. **Super admin block**: Super admin visiting `/reseller/*` redirects to `/dashboard`.
5. **Wallet read**: Reseller wallet/transactions show PHP only.
6. **Fund account**: Starpago checkout created; return URL does not credit alone.
7. **Webhook idempotency**: Duplicate Starpago notify → single `wallet_credit_deposit`.
8. **Create request**: Sufficient balance debits wallet; insufficient balance rejected.
9. **Fulfillment fail**: Super admin “Fail & refund” restores balance, status `failed`.
10. **RLS**: Reseller A cannot read reseller B wallet/requests (verify in Supabase SQL as authenticated user).
