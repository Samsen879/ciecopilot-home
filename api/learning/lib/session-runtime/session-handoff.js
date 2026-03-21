export function createSessionHandoffStub(session = null) {
  return {
    supported: false,
    session_id: session?.session_id ?? null,
    handoff_kind: null,
  };
}
