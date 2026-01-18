# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-01-18

### Added
- **Multi-Process Execution**: Added batch scripts (`baslat-bot-X.bat`) to run each bot in a separate process for better performance.
- **Reliability**: Implemented staggered startup and connection jitter to prevent rate limits.
- **CLI Support**: Updated `index.ts` to accept `--bot=N` arguments.

### Changed
- **Anti-Spam**: Disabled automatic timeout punishment (user request).
- **Bug Fixes**: Fixed `Unknown Message` and Embed Limit errors in `scanSpam` command.

## [1.0.0] - 2026-01-18

### Added
- Initial public release of Vexon Bot.
- Modular monorepo structure.
- Voice channel management commands.
- Dual bot instance support.
- Comprehensive logging system.
