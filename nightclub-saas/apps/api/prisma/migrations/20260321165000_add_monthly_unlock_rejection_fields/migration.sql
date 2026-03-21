ALTER TABLE unlock_requests
  ADD COLUMN rejector_id UUID NULL,
  ADD COLUMN rejected_at TIMESTAMPTZ NULL;

ALTER TABLE unlock_requests
  ADD CONSTRAINT fk_unlock_requests_rejector
    FOREIGN KEY (rejector_id) REFERENCES accounts(account_id);

ALTER TABLE unlock_requests
  ADD CONSTRAINT chk_unlock_requests_rejector_required_for_rejected
    CHECK (status <> 'REJECTED' OR (rejector_id IS NOT NULL AND rejected_at IS NOT NULL));

ALTER TABLE unlock_requests
  ADD CONSTRAINT chk_unlock_requests_rejector_diff
    CHECK (rejector_id IS NULL OR rejector_id <> requester_id);
