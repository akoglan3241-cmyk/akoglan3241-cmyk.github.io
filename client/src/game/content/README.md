# Content Pipeline

This folder is the authoring source for game content. Runtime systems should prefer JSON data here over hardcoded gameplay values.

## Folder Guide

- `items/`: inventory, consumables, quest items, cosmetics, furniture-backed items
- `npcs/`: reusable NPC catalog entries and room placement references
- `furniture/`: furniture placement metadata and interaction defaults
- `cosmetics/`: cosmetic sets and themed bundles for future shops/rewards
- `quests/`: quest chains grouped by NPC or storyline
- `dialogues/`: branching dialogue trees
- `rooms/`: room metadata, portals, pickups, chests, and placed NPC ids
- `shops/`: shop inventories
- `lootTables/`: weighted reward tables
- `worldEvents/`: random room event definitions
- `seasonalEvents/`: event windows and activation metadata
- `schemas/`: JSON schema-style references for authors
- `templates/`: copy-paste starting points for new content
- `tooling/`: validators, constants, and future authoring helpers

## Author Workflow

1. Copy a file from `templates/`.
2. Place it in the appropriate folder.
3. Run `npm.cmd run validate:content`.
4. Fix validation errors before changing gameplay code.

## Notes

- Current gameplay still reads `rooms/core-rooms.json`, `quests/*.json`, `dialogues/*.json`, `items/*.json`, `shops/*.json`, `lootTables/*.json`, `worldEvents/*.json`, and `seasonalEvents/*.json`.
- NPC and furniture catalogs are authoring-first data intended to keep future map expansion and content production consistent.
