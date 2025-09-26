# Summary

This PR adds comprehensive documentation for the multi-store support design in LiveStore React integration. The documentation was created after extensive discussion about supporting multiple store instances ergonomically (similar to Linear's workspace → project → issue pattern).

## Documentation Added

### Design Requirements (docs/reference/multi-store/requirements.md)

- Hard requirements and constraints for multi-store support
- Use cases to support (independent stores, hierarchical stores, multiple instances)
- Design preferences and success criteria

### API Design Proposal (docs/reference/multi-store/api-design.md)

- Core defineStoreContext API
- Provider component with immediate child rendering for concurrent loading
- Store access via React.use()
- Multi-instance support via withStoreId()
- Suspense and error boundary integration
- Comprehensive usage examples

### Implementation Plan (docs/reference/multi-store/implementation-plan.md)

- Phased implementation approach
- Technical details for each component
- Testing strategy
- Success metrics and risk mitigation

## Key Design Decisions

- MobX-style separate contexts - Each store gets its own context for clear isolation
- React.use as primary API - Aligns with modern React patterns
- Immediate child rendering - Enables concurrent store loading
- No library-level dependencies - Applications control store relationships
- Optimize for common case - Single instance per store type, with multi-instance as secondary