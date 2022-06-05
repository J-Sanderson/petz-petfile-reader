# Petz Petfile Reader

Parses petfile data into a human readable format

## Limitations

This is a WIP and many features are still missing. In addition the following assumptions are currently made about any pet passed into the parser:

* The pet is from P3/P4
* The pet is 1st generation
* The pet has no unborn or dependant children

If the pet does not meet these criteria the parser will overflow and either crash, read out junk data, or summon MissingNo. Be a responsible retro virtual pet owner and don't do this.

The parser does not make any modifications to .pet files and so should not cause any corruptions, but it's always a good idea to make backups anyway.

## How to use

Download and run `npm install`

Once installed, move the .pet file is in the root directory and run:

`node reader.js (pet filename)`

e.g.

`node reader.js Bootz.pet`

See output.txt for results.
