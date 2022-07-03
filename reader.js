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

    const uint32Parser = new Parser()
        .endianess('little')
        .uint32('number');
    const int32Parser = new Parser()
        .endianess('little')
        .int32('number');
    
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
        .int32('direction')
        .int32('angle')
        .int32('association');
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
            type: int32Parser, //because it won't accept int32 as a type
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
    // console.log(associationMatrix);
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
Ball paint flags: 
${parseBallData(plainData.ballPaintFlags, loadInfo.species ? 'dog' : 'cat')}
Number of groups: ${plainData.numGroups}
Group colors:
${parseGroupColours(plainData.groupColors)}
Number of balls: ${plainData.numBalls}
Ball colors:
${parseBallData(plainData.ballColors, loadInfo.species ? 'dog' : 'cat', true)}
Padding value: ${plainData.padding}

---

LNZ INFO:

Lnz:
See LNZ Pro.

Clothing info:
${parseClothingInfo(lnzInfo.clothing)}

Breedfile info:
Number of required breedfiles: ${lnzInfo.numRequiredBreedfiles}
Required breedfiles: TODO (only present in mixies)

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
    let tricksByFlavor = [
        tricks.slice(0, 15), //chicken
        tricks.slice(15, 30), //beef
        tricks.slice(30, 45), //fish
        tricks.slice(45, 60), //turkey
        tricks.slice(60, 75), //milk
        tricks.slice(75, 100), //sweets
        tricks.slice(100, 105), //catnip
        tricks.slice(105, 120), //cheese
    ];

    return tricksByFlavor.map(function (flavor, index) {
        return `
Flavor: ${flavorList[index]}
${parseTricks(flavor, flavorList[index])}
        `
    }).join('');
}

function parseTricks(tricks, flavor) {
    const unsetAction = -1;

    return tricks.map(function(trick, index) {
        return `
Gesture: ${getGesture(index, flavor)}
Plan ID: ${trick.planID}
Associated action: ${trick.associatedAction === unsetAction ? 'Not set' : trick.associatedAction + ' (breed SCP action ID)'} 
Direction: ${trick.direction}
Angle: ${trick.angle}
Association: ${trick.angle}
        `
    }).join('');
}

function getGesture(index, flavor) {
    if (flavor === 'Catnip') {
        switch (index) {
            case 0:
                return 'Toy';
                break;
            case 1:
                return 'Up';
                break;
            case 2:
                return 'Down';
                break;
            case 3:
                return 'Left';
                break;
            case 4:
                return 'Right';
                break;
            default:
                return 'Unknown';
        }
    }
    switch (true) {
        case (index <= 2):
            return 'Toy';
            break;
        case (index > 2 && index <= 5):
            return 'Up';
            break;
        case (index > 5 && index <= 8):
            return 'Down';
            break;
        case (index > 8 && index <= 11):
            return 'Left';
            break;
        case (index > 11 && index <= 14):
            return 'Right';
            break;
        default:
            return 'Unknown';
    }
}

function parseBallData(balls, species, isColor) {
    const question = isColor ? 'Color:' : 'Is painted?';
    const noColor = 248;
    return balls.map(function(ball, index) {
        let answer;
        if (isColor) {
            answer = ball.number === noColor ? 'Ball does not exist' : ball.number;
        } else {
            answer = ball.number === 1 ? 'Yes' : 'No';
        }
        return `
Ball number: ${index} (${ballList[species][index] ? ballList[species][index] : 'addball'})
${question} ${answer}
        `
    }).join('');
}

function parseGroupColours(groups) {
    return groups.map(function(group, index) {
        // TODO which group is which index?
        return `
Group: ${index}
Color: ${group.number === -1 ? 'Not painted' : group.number}
        `;
    }).join('');
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

const ballList = {
    cat: [
        'ankleL',
        'ankleR',
        'belly',
        'butt',
        'cheekL',
        'cheekR',
        'chest',
        'chin',
        'earL1',
        'earL2',
        'earR1',
        'earR2',
        'elbowL',
        'elbowR',
        'eyeL',
        'eyeR',
        'fingerL 1',
        'fingerL 2',
        'fingerL 3',
        'fingerR 1',
        'fingerR 2',
        'fingerR 3',
        'handL',
        'handR',
        'head',
        'hipL',
        'hipR',
        'irisL',
        'irisR',
        'jaw',
        'jowlL',
        'jowlR',
        'kneeL',
        'kneeR',
        'knuckleL',
        'knuckleR',
        'neck',
        'nose',
        'shoulderL',
        'shoulderR',
        'snout',
        'soleL',
        'soleR',
        'tail1',
        'tail2',
        'tail3',
        'tail4',
        'tail5',
        'tail6',
        'toeL 1',
        'toeL 2',
        'toeL 3',
        'toeR 1',
        'toeR 2',
        'toeR 3',
        'tongue 1',
        'tongue 2',
        'whiskerL 1',
        'whiskerL 2',
        'whiskerL 3',
        'whiskerR 1',
        'whiskerR 2',
        'whiskerR 3',
        'wristL',
        'wristR',
        'zTrans',
        'zOrient',
    ],
    dog: [
        'L ankle',
        'L eyebrow 1',
        'L eyebrow 2',
        'L eyebrow 3',
        'L ear 1',
        'L ear 2',
        'L ear 3', 
        'L elbow',
        'L eye',
        'L finger 1',
        'L finger 2',
        'L finger 3', 
        'L foot',
        'L hand',
        'L iris',
        'L jowl',
        'L knee',
        'L nostril',
        'L shoulder',
        'L hip',
        'L toe 1',
        'L toe 2',
        'L toe 3', 
        'L wrist',
        'R ankle',
        'R eyebrow 1',
        'R eyebrow 2',
        'R eyebrow 3',
        'R ear 1',
        'R ear 2',
        'R ear 3', 
        'R elbow',
        'R eye',
        'R finger 1',
        'R finger 2',
        'R finger 3', 
        'R foot',
        'R hand',
        'R iris',
        'R jowl',
        'R knee',
        'R nostril',
        'R shoulder',
        'R hip',
        'R toe 1',
        'R toe 2',
        'R toe 3', 
        'R wrist',
        'Belly',
        'Butt',
        'Chest',
        'Chin',
        'Head',
        'Jaw',
        'Neck',
        'Nose (bottom)',
        'Snout',
        'Tail 1',
        'Tail 2',
        'Tail 3',
        'Tail 4',
        'Tail 5',
        'Tail 6',
        'Tongue 1',
        'Tongue 2',
        'zTrans',
        'zOrient',
    ],
}

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
