# Contributing

Thanks for helping out! This is a non-commercial fan project, so every contribution stays free for everyone.

## Good ways to help

- **Android testing**: paste an export from an Android device and report in an issue whether everything shows up correctly.
- **Bug reports**: wrong max level, wrong time, missing item? Open an issue with the item name and what you expected.
- **Game updates**: after a new Clash of Clans update, `src/gamedata.json` needs new levels/items.
- **Ideas and UI improvements**.

## Please don't

- Post your full personal export publicly in an issue. Shorten it to the part that matters, or replace your player tag.

## Making changes

1. Fork the repo and create a branch.
2. Edit files in `src/` (not `index.html` directly).
3. Run `python src/build.py` and open `index.html` to check your change.
4. Open a pull request describing what changed and why.

Versioning follows [Semantic Versioning](https://semver.org): bug fixes = patch, new features or data updates = minor.

By contributing you agree that your contribution is published under the project's license
(PolyForm Noncommercial License 1.0.0).
