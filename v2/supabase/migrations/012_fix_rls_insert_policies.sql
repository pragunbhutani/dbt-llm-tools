-- organisation_settings was missing an INSERT policy, causing upsert() to fail
-- for new organisations that don't yet have a settings row.
CREATE POLICY "Members can insert org settings"
  ON public.organisation_settings FOR INSERT
  WITH CHECK (is_org_member(organisation_id));
