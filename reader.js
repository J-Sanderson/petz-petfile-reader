const fs = require('fs'); 
const Parser = require("binary-parser").Parser;

console.log('Starting pet parser...');
if (!process.argv[2]) {
    console.log('No file specified. Please call the script with the required file as the argument.');
    process.exit();
}
console.log(`Searching for ${process.argv[2]}`);

// INITIAL DATA

fs.readFile(process.argv[2], function (err, data) {
    if (err) {
        console.log(`Could not find file ${process.argv[2]}. Please make sure the file is in the same directory as this script and you have correctly entered the file name.`);
        process.exit();
    }
    console.log('File found!');
    
    const loadInfoParser = new Parser()
        .endianess('little')
        .uint16('sessionID')
        .string('petName', {
            length: 256,
            stripNull: true,
        })
        .string('petBreed', {
            length: 256,
            stripNull: true,
        })
        .string('breedfileLocation', {
            length: 256,
            stripNull: true,
        })
        .uint32('unknown1')
        .uint16('unknown2')
        .uint32('barrier')
        .uint32('unknown3')
        .uint32('species')
        .uint32('speciesIconFlags')
        .uint32('gameVersion')
        .uint32('fileChecksum')
        .array('guid', {
            type: 'uint8',
            length: 16,
        })
        .saveOffset('currentOffset')
    const loadInfo = loadInfoParser.parse(data);

    const trickKnowledgeParser = new Parser()
        .endianess('little')
        .uint32('planID')
        .uint32('associatedAction')
        .uint32('direction')
        .uint32('angle')
        .uint32('association');
    const uint32Parser = new Parser()
        .endianess('little')
        .uint32('number');
    const plainDataParser = new Parser()
        .endianess('little')
        .seek(loadInfo.currentOffset)
        .string('pfm', {
            length: 17,
        })
        .uint8('newDayFlag')
        .uint32('treatTrainingModifier')
        .uint32('unknown1')
        .uint32('unknown2')
        .uint32('neglectModifierActive')
        .uint32('neglectModifierPassive')
        .uint32('neglectThreshold')
        .uint32('unknown3')
        .uint32('runawayThreshold')
        .uint8('unknown4')
        //Timestamps
        .uint32('lastPlayedWith')
        .uint32('lastGameStart')
        .uint32('lastFed')
        .uint32('lastGameStartDuplicate')
        .uint32('unknown5')
        .uint32('lastPlayedWithDuplicate')
        .uint32('lastSaved')
        //End timestamps
        .uint32('randomSeed')
        //Trick knowledge
        .array('trickKnowledge', { //we can later arrange these by flavour, trick type etc
            type: trickKnowledgeParser,
            length: 120,
        })
        //Biorhythms
        .uint32('energy')
        .uint32('fullness')
        .uint32('fatness')
        .uint32('sickness')
        .uint32('catnipped')
        .uint32('fleas')
        .uint32('horniness')
        .uint32('neglect')
        .uint32('age')
        .uint32('fileCreationTime')
        .uint8('unknown6')
        .uint8('unknown7')
        .uint32('currentEyelidColor')
        .uint32('ballPaintFlagNumber')
        .array('ballPaintFlags', {
            type: 'uint8',
            length: function() {
                return this.ballPaintFlagNumber;
            },
        })
        .uint32('numGroups')
        .array('groupColors', {
            type: uint32Parser, //because it won't accept uint32 as a type
            length: function() {
                return this.numGroups;
            },
        })
        .uint32('numBalls') //is this the reason for the ball number limit?
        .array('ballColors', {
            type: uint32Parser, //because it won't accept uint32 as a type
            length: function() {
                return this.numBalls;
            },
        })
        .uint32('padding')
        .saveOffset('currentOffset')
    const plainData = plainDataParser.parse(data);

    const clothingSlotParser = new Parser()
        .endianess('little')
        .uint32('slotNumber')
        .string('clothingFilePath', {
            length: 64,
            stripNull: true,
        })
        .string('clothingResourcePath', {
            length: 128,
            stripNull: true,
        })
    const requiredBreedParser = new Parser()
        .endianess('little')
        .uint16('breedID')
        .uint32('filePathLength')
        .string('breedfilePath', {
            length: function() {
                return this.filePathLength;
            },
        });
    const lnzInfoParser = new Parser()
        .endianess('little')
        .seek(plainData.currentOffset)
        .string('pfm', {
            length: 17,
        })
        .string('lnzAdult', {
            zeroTerminated: true,
        })
        .uint32('magicNumberAdult')
        .saveOffset('currentOffset')
        .string('lnzChild', {
            zeroTerminated: true,
        })
        .uint32('magicNumberChild')
        .uint32('randomSeed')
        // Clothing slots. Assumes P3/P4, check for P5 game value later
        .array('clothing', {
            type: clothingSlotParser,
            length: 17, //are some slots going unused?
        })
        .uint32('numRequiredBreedfiles')
        .array('requiredBreedfiles', {
            type: requiredBreedParser,
            length: function() {
                return this.numRequiredBreedfiles;
            },
        })
        .saveOffset('currentOffset');
    const lnzInfo = lnzInfoParser.parse(data)

    const veterinaryInfoSectionParser = new Parser()
        .endianess('little')
        .string('name', {
            length: 4,
        })
        .uint32('maxRecords')
        .uint32('numTimestamps')
        .array('timestamps', {
            type: uint32Parser,
            length: function() {
                return this.numTimestamps;
            },
        })
        .uint32('numLevels')
        .array('levels', {
            type: uint32Parser,
            length: function() {
                return this.numLevels;
            },
        });
    const biorhythmParser = new Parser()
        .endianess('little')
        .uint32('energy')
        .uint32('fullness')
        .uint32('fatness')
        .uint32('sickness')
        .uint32('catnipped')
        .uint32('fleas')
        .uint32('horniness')
        .uint32('neglect')
        .uint32('age')
        .uint32('recordTime');
    const veterinaryInfoParser = new Parser()
        .endianess('little')
        .seek(lnzInfo.currentOffset)
        .string('pfm', {
            length: 17,
        })
        .uint8('gender')
        .uint8('isNeut')
        .uint8('isDep')
        .uint8('isPreg')
        .uint32('numSections')
        .array('sections', {
            type: veterinaryInfoSectionParser,
            length: function() {
                return this.numSections;
            },
        })
        .uint32('numBiorhythms')
        .array('biorhythms', {
            type: biorhythmParser,
            length: function() {
                return this.numBiorhythms;
            },
        })
        .saveOffset('currentOffset');
    const veterinaryInfo = veterinaryInfoParser.parse(data);

    const alleleParser = new Parser()
        .endianess('little')
        .uint32('center')
        .uint32('range')
        .uint8('bitmaskFlag')
        .uint32('weight')
        .uint8('weightType')
        .uint8('combineType')
    const genomeParser = new Parser()
        .endianess('little')
        .seek(veterinaryInfo.currentOffset)
        // first chromosome set
        .uint32('numSpriteAlleles1')
        .array('spriteChromosome1', {
            type: alleleParser,
            length: function() {
                return this.numSpriteAlleles1;
            },
        })
        .uint32('numBehaviourAlleles1')
        .array('behaviourChromosome1', {
            type: alleleParser,
            length: function() {
                return this.numBehaviourAlleles1;
            },
        })
        .uint32('numLooksAlleles1')
        .array('looksChromosome1', {
            type: alleleParser,
            length: function() {
                return this.numLooksAlleles1;
            },
        })
        // second chromosome set
        .uint32('numSpriteAlleles2')
        .array('spriteChromosome2', {
            type: alleleParser,
            length: function() {
                return this.numSpriteAlleles2;
            },
        })
        .uint32('numBehaviourAlleles2')
        .array('behaviourChromosome2', {
            type: alleleParser,
            length: function() {
                return this.numBehaviourAlleles2;
            },
        })
        .uint32('numLooksAlleles2')
        .array('looksChromosome2', {
            type: alleleParser,
            length: function() {
                return this.numLooksAlleles2;
            },
        })
        //if P5 additional uint32 padding
        .saveOffset('currentOffset');
    const genome = genomeParser.parse(data);

    // need to add unborn child data if relevant

    const spriteAlleleParser = new Parser()
        .endianess('little')
        .uint32('center')
        .uint32('range')
        .uint8('bitmaskFlag')
        .uint32('weight')
        .uint8('weightType')
        .uint8('combineType')
        .uint32('offset')
        .uint32('centeringRate')
    const behaviourDescriptorParser = new Parser()
        .endianess('little')
        .seek(genome.currentOffset)
        .string('pfm', {
            length: 17,
        })
        .uint32('numSpriteAlleles')
        .array('spriteDescriptor', {
            type: spriteAlleleParser,
            length: function() {
                return this.numSpriteAlleles;
            },
        })
        .uint32('numGoalAlleles')
        .array('goalDescriptor', {
            type: spriteAlleleParser,
            length: function() {
                return this.numGoalAlleles;
            },
        })
        .saveOffset('currentOffset');
    const behaviourDescriptor = behaviourDescriptorParser.parse(data);

    const spriteKeyParser = new Parser()
        .endianess('little')
        .uint32('numTimestamps')
        .array('timestampIndexes', {
            type: uint32Parser,
            length: function() {
                return this.numTimestamps;
            },
        })
        .array('guid', {
            type: 'uint8',
            length: 16, //16 bytes, could be parsed better, we're just keeping this as a placeholder.
        })
        .uint16('spriteID')
    const goalKeyParser = new Parser()
        .endianess('little')
        .uint32('numTimestamps')
        .array('timestampIndexes', {
            type: uint32Parser,
            length: function() {
                return this.numTimestamps;
            },
        })
        .uint16('unknownID')
    const affinityDescriptorParser = new Parser()
        .endianess('little')
        .array('guid', {
            type: 'uint8',
            length: 16, //16 bytes, could be parsed better, we're just keeping this as a placeholder.
        })
        .uint32('unknown1')
        .uint32('unknown2')
        .uint32('unknown3')
        .uint32('unknown4')
        .uint8('unknown5') //8 or 32?
    const associationMatrixParser = new Parser()
        .endianess('little')
        .seek(behaviourDescriptor.currentOffset)
        .uint32('numSpriteKeys')
        .array('spriteKeys', {
            type: spriteKeyParser,
            length: function() {
                return this.numSpriteKeys;
            },
        })
        .uint32('numGoalKeys')
        .array('goalKeys', {
            type: goalKeyParser,
            length: function() {
                return this.numGoalKeys;
            },
        })
        .uint32('numValInts')
        .array('valInts', {
            type: uint32Parser,
            length: function() {
                return this.numValInts;
            },
        })
        .uint32('numTimestamps')
        .array('timestamps', {
            type: uint32Parser,
            length: function() {
                return this.numTimestamps;
            },
        })
        .uint32('numAffinityDescriptors')
        .array('affinityDescriptors', {
            type: affinityDescriptorParser,
            length: function() {
                return this.numAffinityDescriptors;
            },
        })
        .saveOffset('currentOffset');
    const associationMatrix = associationMatrixParser.parse(data);

    const ancestryInfoParser = new Parser()
        .endianess('little')
        .seek(associationMatrix.currentOffset)
        .string('pfm', {
            length: 15,
        })
        //todo add ancestors if pet is > 1st gen
        //right now we assume the pet is 1st gen and only parse its own data
        .uint32('unknown1')
        .array('guid', {
            type: 'uint8',
            length: 16, //16 bytes, could be parsed better, we're just keeping this as a placeholder.
        })
        .uint32('nameLength')
        .string('name', {
            length: function() {
                return this.nameLength
            },
        })
        .uint32('breedNameLength')
        .string('breedName', {
            length: function() {
                return this.breedNameLength
            },
        })
        .uint32('ownerNameLength')
        .string('ownerName', {
            length: function() {
                return this.ownerNameLength
            },
        })
        .uint32('adoptionDate')
        .uint32('birthDate')
        .uint32('numGenerations')
        .uint8('outlineColor')
        .uint8('nextPetFlag')
        //subsequent ancestors go here
        .uint8('padding')
        .saveOffset('currentOffset');

    const ancestryInfo = ancestryInfoParser.parse(data);

    const profileInfoParser = new Parser()
        .endianess('little')
        .seek(ancestryInfo.currentOffset)
        .uint32('ownerNameLength')
        .string('ownerName', {
            length: function() {
                return this.ownerNameLength
            },
        })
        .uint32('commentLength')
        .string('comment', {
            length: function() {
                return this.commentLength
            },
        })
        .uint32('commentTimestamp')
        .uint32('extraInfoFlag')
        //once again we assume a single comment for now
        .saveOffset('currentOffset');
    const profileInfo = profileInfoParser.parse(data);

    const dependentInfoParser = new Parser()
        .endianess('little')
        .seek(profileInfo.currentOffset)
        //todo add dependent child data if present
        //how does this work in P5?
        .uint8('dependentFlag')
        //assume the pet has no dependents and move on
        .saveOffset('currentOffset');
    const dependentInfo = dependentInfoParser.parse(data);

    const unknownInfoParser = new Parser()
        .endianess('little')
        .seek(dependentInfo.currentOffset)
        .uint32('computeMatchmakerIDInt')
        .uint32('modifyCourtshipStageTimestamp1')
        .uint32('modifyCourtshipStageTimestamp2')
        .uint8('unknown1')
        //todo unknown 24 byte structures
    const unknownInfo = unknownInfoParser.parse(data);

    //todo bitmap data

    // console.log(loadInfo);
    // console.log(plainData);
    // console.log(lnzInfo);
    // console.log(veterinaryInfo);
    // console.log(genome);
    // console.log(behaviourDescriptor);
    console.log(associationMatrix);
    // console.log(ancestryInfo)
    // console.log(profileInfo);
    // console.log(dependentInfo);
    // console.log(unknownInfo);


    fs.writeFile('output.txt', parseResults(
        loadInfo,
        plainData, 
        lnzInfo, 
        veterinaryInfo, 
        genome, 
        behaviourDescriptor,
        associationMatrix
    ), function(err) {
        if (err) {
            console.log('Error saving file');
            process.exit();
        }
        console.log('Output saved!');
    })

});

// TEXT OUTPUT

function parseResults(
    loadInfo, 
    plainData, 
    lnzInfo, 
    veterinaryInfo, 
    genome, 
    behaviourDescriptor,
    associationMatrix
    ) {
    //todo properly display species icon flags, game version
    return `
${process.argv[2]} output:

LOAD INFO:
Session ID: ${loadInfo.sessionID}
Pet name: ${loadInfo.petName}
Pet breed: ${loadInfo.petBreed}
Breedfile location: ${loadInfo.breedfileLocation}

Unknown 32 bit integer: ${loadInfo.unknown1}
Unknown 16 bit integer: ${loadInfo.unknown2}
Barrier: ${loadInfo.barrier}
Unknown 32 bit integer: ${loadInfo.unknown3}
Species: ${loadInfo.species ? 'Dog' : 'Cat'}
Species icon flags: ${loadInfo.speciesIconFlags}
Game version: ${(loadInfo.gameVersion).toString(16)}
File checksum: ${loadInfo.fileChecksum}
GUID: ${parseGUID(loadInfo.guid)}

---

PLAIN DATA:

Modifiers and thresholds:
New day flag: ${plainData.newDayFlag} (${plainData.newDayFlag ? 
    'Game not started today, pet will have energy 100 and fullness 50' : 
    'Game started previously today, pet will have energy 100 and fullness 50 if the last save was over 30 minutes ago'
})
Treat training modifier: ${plainData.treatTrainingModifier} (${plainData.treatTrainingModifier ?
    'Pet will fall over instead of attempting tricks' :
    'Pet will attempt tricks'
})
Unknown 32 bit integer: ${plainData.unknown1}
Unknown 32 bit integer: ${plainData.unknown2}
Active neglect modifier: ${plainData.neglectModifierActive} (amount neglect will increment when disciplined)
Passive neglect modifier: ${plainData.neglectModifierPassive} (amount neglect will decrement when brought out for the first time in the day)
Neglect threshold: ${plainData.neglectThreshold} (pet will start acting neglected if the neglect level is greater than or equal to this value)
Unknown 32 bit integer: ${plainData.unknown3}
Runaway threshold: ${plainData.runawayThreshold} (pet will run away if the neglect level is greater than or equal to this value)
Unknown 8 bit integer: ${plainData.unknown4}

Event timestamps:
Last played with: ${new Date(plainData.lastPlayedWith * 1000)}
Last game start: ${new Date(plainData.lastGameStart * 1000)}
Last fed: ${new Date(plainData.lastFed * 1000)}
Last game start duplicate: ${new Date(plainData.lastGameStartDuplicate * 1000)}
Unknown 32 bit integer: ${plainData.unknown5}
Last played with duplicate: ${new Date(plainData.lastPlayedWithDuplicate * 1000)}
Last saved: ${new Date(plainData.lastSaved * 1000)}
Random seed: ${plainData.randomSeed}

Trick knowledge:
${parseTrickKnowledge(plainData.trickKnowledge)}

Biorhythms:
Energy: ${plainData.energy}
Fullness: ${plainData.fullness}
Fatness: ${plainData.fatness}
Sickness: ${plainData.sickness}
Catnipped: ${plainData.catnipped}
Fleas: ${plainData.fleas}
Horniness: ${plainData.horniness}
Neglect: ${plainData.neglect}
Age: ${plainData.age}

File creation time:
High res timestamp: ${plainData.fileCreationTime} (QueryPerformanceCounter value, unparsed here)

Saved color info:
Unknown 8 bit integer: ${plainData.unknown6}
Unknown 8 bit integer: ${plainData.unknown7}
Current eyelid color: ${plainData.currentEyelidColor} (if different to lnz value, will revert to lnz on restoring original colors)
Number of ball paint flags: ${plainData.ballPaintFlagNumber}
Ball paint flags: TODO
Number of groups: ${plainData.numGroups}
Group colors: TODO
Number of balls: ${plainData.numBalls}
Ball colors: TODO
Padding value: ${plainData.padding}

---

LNZ INFO:

Lnz:
See LNZ Pro.

Clothing info:
${parseClothingInfo(lnzInfo.clothing)}

Breedfile info:
Number of required breedfiles: ${lnzInfo.numRequiredBreedfiles}
Required breedfiles: TODO

--

VETERINARY INFO:

Statuses:
Gender: ${veterinaryInfo.gender} (${veterinaryInfo.gender ? 'female' : 'male'})
Is neutered: ${veterinaryInfo.isNeut ? 'Yes' : 'No'} 
Is dependent: ${veterinaryInfo.isDep ? 'Yes' : 'No'} 
Is pregnant: ${veterinaryInfo.isPreg ? 'Yes' : 'No'} 

Veterinary info sections:
Number of veterinary info sections: ${veterinaryInfo.numSections}
Sections:
${parseVeterinarySections(veterinaryInfo.sections)}
Number of biorhythm records: ${veterinaryInfo.numBiorhythms}
Biorhythm records: ${parseBiorhythmRecords(veterinaryInfo.biorhythms)}

---

GENOME:

Sprite chromosome 1:
Number of alleles: ${genome.numSpriteAlleles1}
Alleles: ${parseChromosome(genome.spriteChromosome1, 'sprite', false)}

Behaviour chromosome 1:
Number of alleles: ${genome.numBehaviourAlleles1}
Alleles: ${parseChromosome(genome.behaviourChromosome1, 'behaviour', false)}

Looks chromosome 1:
Number of alleles: ${genome.numLooksAlleles1}
Alleles: ${parseChromosome(genome.looksChromosome1, 'looks', false)}

Sprite chromosome 2:
Number of alleles: ${genome.numSpriteAlleles2}
Alleles: ${parseChromosome(genome.spriteChromosome2, 'sprite', false)}

Behaviour chromosome 2:
Number of alleles: ${genome.numBehaviourAlleles2}
Alleles: ${parseChromosome(genome.behaviourChromosome2, 'behaviour', false)}

Looks chromosome 2:
Number of alleles: ${genome.numLooksAlleles2}
Alleles: ${parseChromosome(genome.looksChromosome2, 'looks', false)}

---

BEHAVIOUR DESCRIPTOR:

Sprite descriptor:
Number of alleles: ${behaviourDescriptor.numSpriteAlleles}
Alleles: ${parseChromosome(behaviourDescriptor.spriteDescriptor, 'sprite', true)}

Goal descriptor:
Number of alleles: ${behaviourDescriptor.numGoalAlleles}
Alleles: ${parseChromosome(behaviourDescriptor.goalDescriptor, 'behaviour', true)}

---

ASSOCIATION MATRIX:

Number of sprite keys: ${associationMatrix.numSpriteKeys}
Sprite keys: ${parseSpriteKeys(associationMatrix.spriteKeys)}

Number of goal keys: ${associationMatrix.numGoalKeys}
Goal keys: ${parseGoalKeys(associationMatrix.goalKeys)}

Number of integer values: ${associationMatrix.numValInts}
Integer values: ${parseIntegerValues(associationMatrix.valInts)}

Number of timestamp values: ${associationMatrix.numTimestamps}
Timestamp values:
${parseTimestampValues(associationMatrix.timestamps)}

Number of affinity descriptors: ${associationMatrix.numAffinityDescriptors}
Affinity descriptors: ${parseAffinityDescriptors(associationMatrix.affinityDescriptors)}
    `;
    //TODO ancestry, dependents, unknown values, bitmap data
}

// PARSING FUNCTIONS

function parseGUID(guid) {
    return guid.map(function(byte) {
        return byte.toString(16);
    }).join(' ');
}

function parseTrickKnowledge(tricks) {
    const unsetAction = 4294967295; //hex FFFFFFFF
    // is this also in use for direction/angle/association?

    return tricks.map(function (trick, index) {
        return `
Trick slot: ${index}
Flavor: ${getTrickFlavor(index)}
Gesture: TODO
Plan ID: ${trick.planID}
Associated action: ${trick.associatedAction === unsetAction ? 'Not set' : trick.associatedAction + ' (breed SCP action ID)'} 
Direction: ${trick.direction}
Angle: ${trick.angle}
Association: ${trick.angle}
        `
    }).join('');
}

function getTrickFlavor(index) {
    // TODO need to slice array into flavours and get gesture slots by position
    let flavor = '';
    switch (true) {
        case (index <= 15):
            flavor = 'Chicken';
            break;
        case (index > 15 && index <= 30):
            flavor = 'Beef';
            break;
        case (index > 30 && index <= 45):
            flavor = 'Fish';
            break;
        case (index > 45 && index <= 60):
            flavor = 'Turkey';
            break;
        case (index > 60 && index <= 75):
            flavor = 'Milk';
            break;
        case (index > 75 && index <= 100):
            flavor = 'Sweets';
            break;
        case (index > 100 && index <= 105):
            flavor = 'Catnip';
            break;
        case (index > 105 && index <= 120):
            flavor = 'Cheese';
            break;
        default:
            return 'Unknown';
    }

    return flavor;
}

function parseClothingInfo(slots) {
    return slots.map(function(slot) {
        if (slot.slotNumber) {
            return `
Slot: ${clothesList[slot.slotNumber]}
File path: ${slot.clothingFilePath}
Resource path: ${slot.clothingResourcePath}
            `;
        }
    }).join('');
}

function parseVeterinarySections(sections) {
    return veterinarySectionList.map(function(listItem) {
        let match = sections.find(function(section) {
            return section.name.split('').reverse().join('') === listItem.name;
        });
        if (match) {
            return `
Name: ${listItem.name}
Description: Number of times the function ${listItem.func} was called${listItem.itemTrigger ? ' if triggered by the ' + listItem.itemTrigger : ''}.
Present: Yes
Max number of records stored: ${match.maxRecords}
Number of timestamps stored: ${match.numTimestamps}
Number of ${listItem.storedLevel} levels stored: ${match.numLevels}
Records:
${parseVeterinaryTimestamp(match)}
            `;
        }
        return `
Name: ${listItem.name}
Description: Number of times the function ${listItem.func} was called.
Present: No
        `;
    }).join('')
}

function parseVeterinaryTimestamp(record) {
    return record.timestamps.map(function(timestamp, index) {
        return `${new Date(timestamp.number * 1000)}: ${record.levels[index].number}`;
    }).join('\n');
}

function parseBiorhythmRecords(biorhythms) {
    return biorhythms.map(function(record) {
        return `
Date: ${new Date(record.recordTime)}
Energy: ${record.energy}
Fullness: ${record.fullness}
Fatness: ${record.fatness}
Sickness: ${record.sickness}
Catnipped: ${record.catnipped}
Fleas: ${record.fleas}
Horniness: ${record.horniness}
Neglect: ${record.neglect}
Age: ${record.age}
        `
    }).join('');
}

function parseChromosome(chromosome, type, isDescriptor) {
    const unused = 4294967295; //hex FFFFFFFF
    const centerType = {
        sprite: `The pet's preferred value for this adjective. Flags the allele as unused if equal to ${unused} (hex FFFFFFFF)`,
        behaviour: 'The pet\s trait level',
        looks: 'Either a breed ID or a integer value',
    }

    return chromosome.map(function(allele, index) {
        // TODO parse out bitmasks for faves
        let str = `
Name: ${chromosomeList[type][index]} ${allele.center === unused ? '(unused)' : ''}
Center: ${allele.center} (${centerType[type]})
Range: ${allele.range} (Maximum possible deviation from the center value.${type === 'looks' ? ' Either the pet\'s seed value, or unused' : ''})
Is bitmask: ${allele.bitmaskFlag ? 'Yes' : 'No'}
Weight: ${allele.weight} (Dictates how important this trait is)
Weight type: ${allele.weightType}
Combine type: ${allele.combineType}`
        if (isDescriptor) {
            return str + `
Offset: ${allele.offset}
Centering rate: ${allele.centeringRate}
            `;
        }
        return str + '\n';
    }).join('');
}

function parseSpriteKeys(keys) {
    return keys.map(function (key) {
        let timestampIndexes = key.timestampIndexes.map(function(index) {
            return index.number;
        }).join(', ')
        return `
Number of timestamps: ${key.numTimestamps}
Timestamp indexes: ${timestampIndexes}
GUID: ${parseGUID(key.guid)} (either a pet ID, or all zeroes)
Sprite ID: ${key.spriteID} (breed, toy etc ID, depending on what this key refers to)
        `
    }).join('');
}

function parseGoalKeys(keys) {
    return keys.map(function(key) {
        let timestampIndexes = key.timestampIndexes.map(function(index) {
            return index.number;
        }).join(', ')
        return `
Number of timestamps: ${key.numTimestamps}
Timestamp indexes: ${timestampIndexes}
Unknown ID: ${key.unknownID}
        `
    }).join('');
}

function parseIntegerValues(values) {
    return values.map(function(value) {
        return value.number;
    }).join(', ');
}

function parseTimestampValues(values) {
    return values.map(function(value) {
        return new Date(value.number * 1000);
    }).join('\n');
}

function parseAffinityDescriptors(descriptors) {
    return descriptors.map(function(descriptor) {
        return `
GUID: ${parseGUID(descriptor.guid)}
Unknown value 1: ${descriptor.unknown1}
Unknown value 2: ${descriptor.unknown2}
Unknown value 3: ${descriptor.unknown3}
Unknown value 4: ${descriptor.unknown4}
Unknown value 5: ${descriptor.unknown5}
        `
    }).join('')
}

// REFERENCES

const flavorList = [
    'Chicken',
    'Beef',
    'Fish',
    'Turkey',
    'Milk',
    'Sweets',
    'Catnip',
    'Cheese',
]

const clothesList = [ // assuming P3/4
    '',
    'Shirt',
    'Pant',
    'Sock_FrontL',
    'Sock_FrontR',
    'Sock_BackL',
    'Sock_BackR',
    'Tail',
    'Hat',
    'Hat2',
    'EarringL',
    'EarringR',
    'NoseThing',
    'NoseThing2',
    'Glasses',
]

// show all of these, display 'not present' if the petfile doesn't have it.
const veterinarySectionList = [
    {
        name: 'PLAY',
        func: 'PetSprite::GotPlayedWith',
        storedLevel: 'neglect',
    },
    {
        name: 'BFED',
        func: 'PlanEatDrinkFromBowl::Execute',
        storedLevel: 'fatness',
    },
    {
        name: 'CATN',
        func: 'PetSprite::HandleCatnipped',
        storedLevel: 'catnipped',
    },
    {
        name: 'DISC',
        func: 'PetSprite::HandleDisciplined',
        storedLevel: 'naughtiness', // trait, not biorhythm
    },
    {
        name: 'MATE',
        func: 'PetSprite::Mate',
        storedLevel: 'unknown', // always 1
    },
    {
        name: 'MFLE',
        func: 'PetSprite::EventMedicine',
        itemTrigger: 'flea spray',
        storedLevel: 'fleas',
    },
    {
        name: 'MSCK',
        func: 'PetSprite::EventMedicine',
        itemTrigger: 'medicine bottle',
        storedLevel: 'sickness',
    },
    {
        name: 'TREA',
        func: 'PlanEatCapturedSprite::Execute',
        storedLevel: 'fatness',
    },
]

chromosomeList = {
    sprite: [
        'Type',
        'Chrz',
        'Toyz',
        'Prop',
        'Part',
        '3D',
        'Color',
        'Flavor',
        'Size',
        'Mass',
        'Friction',
        'Tasty',
        'Edible',
        'Fatty',
        'Liquid',
        'Drug',
        'Aphrodisiac',
        'Discipline',
        'Chew',
        'Tug',
        'Density',
        'Thickness',
        'Soft',
        'Fuzzy',
        'Round',
        'Bounce',
        'Swatty',
        'Pretty',
        'Vain',
        'Paint',
        'Groom',
        'BadNoisy',
        'NiceNoisy',
        'Flies',
        'Rideable',
        'Mouselike',
        'Unknown1',
        'Unknown2',
        'Unknown3',
        'Unknown4',
        // TODO there appears to be a final value here unlisted in the document, but in use
    ],
    behaviour: [
        'Liveliness',
        'Playfulness',
        'Independence',
        'Confidence',
        'Naughtiness',
        'Acrobaticness',
        'Patience',
        'Kindness',
        'Nurturing',
        'Finickiness',
        'Intelligence',
        'Messiness',
        'Quirkiness',
        'Insanity',
        'Constitution',
        'Metabolism',
        'Dogginess',
        'LoveDestiny',
        'Fertility',
        'LoveLoyalty',
        'Libido',
        'OffspringSex',
    ],
    looks: [
        'Unknown1',
        'Unknown2',
        'Default Scale',
        'Ears',
        'Head',
        'Whiskers',
        'Feet',
        'Legs',
        'Tail',
        'Body',
        'Coat',
        'Tongue',
        'Eye Color',
        'Lid Color',
        'Coat Color 1',
        'Coat Color 2',
        'Coat Color 3',
        'Coat Color 4',
        'Coat Color 5',
        'Marking Factor 2',
        'Marking Factor 1',
        'Marking 1',
        'Marking 2',
        'Leg Extension',
        'Body Extension',
    ],
};
