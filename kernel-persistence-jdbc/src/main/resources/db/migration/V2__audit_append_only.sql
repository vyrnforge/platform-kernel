CREATE OR REPLACE FUNCTION platform_reject_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'platform_audit_event is append-only'
        USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER platform_audit_event_append_only
BEFORE UPDATE OR DELETE ON platform_audit_event
FOR EACH ROW
EXECUTE FUNCTION platform_reject_audit_mutation();

COMMENT ON TABLE platform_audit_event IS
    'Append-only platform audit evidence. Application UPDATE/DELETE is rejected by trigger.';
