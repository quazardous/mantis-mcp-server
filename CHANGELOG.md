# Changelog

## [0.4.0] - 2024-03-29

### Improvements
- Refactored code, extracting duplicate Mantis API configuration check logic into the `withMantisConfigured` higher-order function
- Optimized error handling with clearer error identification and response format
- Enhanced logging with more detailed error context information
- Optimized JSON data compression functionality, automatically determining compression based on data size

### Refactoring
- Unified implementation approach for all tools, reducing code duplication
- Improved function type definitions for better type safety
- Optimized error handling flow, improving code maintainability

## [0.2.0] - 2024-03-21

### New Features
- Added `withMantisConfigured` higher-order function to handle common validation logic
- Added structured error response format including `isError` flag

### Improvements
- Optimized return types for all tools to comply with MCP SDK requirements
- Improved error handling mechanism with more detailed error information
- Optimized compression functionality for the `get_issues` tool
- Unified error handling and logging across all tools

### Bug Fixes
- Fixed issue where tool return types did not comply with MCP SDK requirements
- Fixed inconsistent error response format

## [0.1.0] - 2024-03-20

### New Features
- Initial release
- Implemented basic Mantis API integration
- Added basic functionality for issue management, user management, and project management
- Implemented statistical analysis features
- Added performance optimization features (field selection, pagination, auto-compression) 