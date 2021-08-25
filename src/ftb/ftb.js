const logger = require('../logger');
const bodyTurretLookup = require('./body-turrets');
const {
    barrelNameLookup, 
    maxBarrelPerTypeLookup,
    maxChildrenLookup,
    bodyShapeValueLookup
} = require('./lookups');

const constants = require('./constants');

// https://stackoverflow.com/questions/11409895/whats-the-most-elegant-way-to-cap-a-number-to-a-segment
const clamp = (num, min, max) => {
    return num <= min ? min : num >= max ? max : num;
};

// ================================================================================
// Projectile constructors (bullet, drone, swarm, sunchip, etc).
// ================================================================================
const ProjectileConstructorLookup = new Map();

(function initProjectileConstructors(lookup){
    lookup.set(0, (barrel, tank) => constructGunBullet(barrel, tank));    
    lookup.set(1, (barrel, tank) => constructTrap(barrel, tank));
    lookup.set(2, (barrel, tank) => constructDrone(barrel, tank));
    lookup.set(3, (barrel, tank) => constructNecro(barrel, tank));
    lookup.set(4, (barrel, tank) => constructHeavy3GunBullet(barrel, tank));
    lookup.set(50, (barrel, tank) => constructHeavy3GunBullet(barrel, tank));

    lookup.set(100, (barrel, tank) => constructMinion(barrel, tank));
    lookup.set(150, (barrel, tank) => constructSwarm(barrel, tank));    
    lookup.set(200, (barrel, tank) => constructBigAuto4GunTurret(barrel, tank));    
    lookup.set(250, (barrel, tank) => constructMissileBarrel(barrel, tank));    
    lookup.set(300, (barrel, tank) => constructPillbox(barrel, tank));    
    lookup.set(350, (barrel, tank) => constructRotatingMissileBarrel(barrel, tank));
    lookup.set(400, (barrel, tank) => constructPentagon(barrel, tank));
    lookup.set(450, (barrel, tank) => constructSquareMinion(barrel, tank));
    lookup.set(500, (barrel, tank) => constructCenterBodyAutoTwinTurret(barrel, tank));  
    lookup.set(550, (barrel, tank) => constructCenterBodySniperTurret(barrel, tank));
    lookup.set(600, (barrel, tank) => constructPredatorGunBullet(barrel, tank)); 
    lookup.set(650, (barrel, tank) => constructBigAuto4GunTurret(barrel, tank));
    lookup.set(700, (barrel, tank) => constructBoomerang(barrel, tank));
    lookup.set(750, (barrel, tank) => constructBlock(barrel, tank));
    lookup.set(800, (barrel, tank) => constructRocketBarrel(barrel, tank));
    lookup.set(850, (barrel, tank) => constructSidewinderBarrel(barrel, tank));
    lookup.set(900, (barrel, tank) => constructReverseMissileBarrel(barrel, tank));
    
})(ProjectileConstructorLookup);
// ================================================================================

// ================================================================================
// Barrel constructors (gun barrel, trap barrel, drone barrel, etc).
// ================================================================================
const BarrelConstructorLookup = new Map();

(function initBarrelConstructors(lookup){    
    lookup.set(0, (barrel, tank) => constructBulletGunBarrel(barrel, tank));    
    lookup.set(1, (barrel, tank) => constructTrapBarrel(barrel, tank));
    lookup.set(2, (barrel, tank) => constructDroneBarrel(barrel, tank));
    lookup.set(3, (barrel, tank) => constructNecroBarrel(barrel, tank));
    lookup.set(4, (barrel, tank) => constructBelowBodyAutoTurret(barrel, tank));
    lookup.set(50, (barrel, tank) => constructAboveBodyAutoTurret(barrel, tank));

    lookup.set(100, (barrel, tank) => constructMinionBarrel(barrel, tank));
    lookup.set(150, (barrel, tank) => constructSwarmBarrel(barrel, tank));    
    lookup.set(200, (barrel, tank) => constructBelowBodyBigAuto4GunTurretContainer(barrel, tank));    
    lookup.set(250, (barrel, tank) => constructMissileGunBarrel(barrel, tank));    
    lookup.set(300, (barrel, tank) => constructPillboxGunBarrel(barrel, tank));    
    lookup.set(350, (barrel, tank) => constructRotatingMissileGunBarrel(barrel, tank));    
    lookup.set(400, (barrel, tank) => constructPentagonBarrel(barrel, tank));
    lookup.set(450, (barrel, tank) => constructSquareMinionBarrel(barrel, tank));
    lookup.set(500, (barrel, tank) => constructCenterBodyAutoTwinTurretContainer(barrel, tank));
    lookup.set(550, (barrel, tank) => constructCenterBodySniperTurretContainer(barrel, tank));
    lookup.set(600, (barrel, tank) => constructPredatorGunBarrel(barrel, tank));   
    lookup.set(650, (barrel, tank) => constructCenterBodyBigAuto4GunTurretContainer(barrel, tank));   
    lookup.set(700, (barrel, tank) => constructBoomerangBarrelContainer(barrel, tank));  
    lookup.set(750, (barrel, tank) => constructBlockBarrelContainer(barrel, tank));
    lookup.set(800, (barrel, tank) => constructRocketBarrelContainer(barrel, tank));
    lookup.set(850, (barrel, tank) => constructSidewinderBarrelContainer(barrel, tank));
    lookup.set(900, (barrel, tank) => constructReverseMissileBarrelContainer(barrel, tank));
})(BarrelConstructorLookup);
// ================================================================================

// https://stackoverflow.com/questions/175739/built-in-way-in-javascript-to-check-if-a-string-is-a-valid-number
const isNumber = (value) => {
    return !isNaN(+value);
};

const stripHash = (value) => {
    if (typeof value !== 'string') {
        return value;
    }

    return value.replace('#', '');
};

// Convert hex string '#ABCDEF' to RGB values.
const hexToRGB = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    
    if (result){
      return {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
        }
    }
    return null;
};

const getBarrelStats = (barrel) => {
    return `[${barrel.basereload}, ${barrel.knockback}, 1, 1, 1, ${barrel.damage}, 1, 1, 1, 1, 1, ${barrel.spread}, 1]`;    
};

// =================================================================================================================
// Sample FTB code.
// =================================================================================================================
// 32*circle*#00b2e1*#555555*4/12/0/0.9/0/0/40[{"angle":359.1868541584763,"xoffset":0,"yoffset":0,
// "width":25,"baselength":65,"length":65,"basereload":120,"reload":0,"basedelay":0,"delay":0,
// "delayed":true,"hasKnockBack":true,"type":0,"knockback":0,"disabled":true,"spread":0,"image":"rectangle",
// "color":"#888888","bulletColor":"#ffeb69","b":[12.5,6.5,360],"damage":65,"comment":""}, 
// {"angle":269.84248622633436,"xoffset":0,"yoffset":0,"width":25,"baselength":65,"length":65,"basereload":120,
// "reload":0,"basedelay":0,"delay":0,"delayed":true,"hasKnockBack":true,"type":0,"knockback":0,"disabled":true,
// "spread":0,"image":"rectangle","color":"#888888","bulletColor":"#ffeb69","b":[12.5,6.5,360],"damage":65,
// "comment":""}];
// =================================================================================================================

async function parseBody (ftbCode) {            
    try {
        const rawCode = ftbCode.trim();
        const firstBracketIndex = rawCode.indexOf('[');
        // 32*circle*#00b2e1*#555555*4/12/0/0.9/0/0/40
        const bodyCode = rawCode.substring(0, firstBracketIndex);            
        const bodyProps = bodyCode.split('*');

        // 4/12/0/0.9/0/0/40
        const rawBodyStatsCode = bodyProps[bodyProps.length - 1];    
        const bodyStats = rawBodyStatsCode.split('/');

        const body = {
            size: bodyProps[0],
            shape: bodyProps[1],
            fillColor: bodyProps[2],
            borderColor: bodyProps[3],
            stats: bodyStats
        };

        return body;
    }
    catch (error){
        await logger.error(error);
    }

    return null;
}

async function parseBarrels (ftbCode) {
    try {
        const rawCode = ftbCode.trim();
        const bracketFirstPos = rawCode.indexOf('[');
        const bracketLastPos = rawCode.lastIndexOf(']');        
        const barrelsCode = rawCode.substring(bracketFirstPos, bracketLastPos+1);
        
        const barrels = JSON.parse(barrelsCode);
        return barrels;
    }
    catch (error){
        await logger.error(error);
    }

    return [];
}

// Returns an object containing body and barrels descriptors.
async function parse (ftbCode, tankId, tankName) {
    const ftbTank = {
        id: tankId,
        name: tankName,
        body: await parseBody(ftbCode),
        barrels: await parseBarrels(ftbCode)
    };

    return ftbTank;
}

async function validate (ftbTank) {
    const errors = [];

    try {
        if (!isNumber(ftbTank.body.size)){
            errors.push('Tank body size must be a number.');
        }

        // Validate tank body size.
        // if (ftbTank.body.size < constants.MinBodySize || ftbTank.body.size > constants.MaxBodySize){
        //     errors.push(`Tank body size must be between ${constants.MinBodySize} and ${constants.MaxBodySize}.`);            
        // }

        // Validate tank body shape
        if (!constants.ValidBodyShapes.includes(ftbTank.body.shape)) {
            errors.push(`Tank body shape must be one of the values in [${constants.ValidBodyShapes}].`);
        }

        // Validate tank body fill color.
        if (!hexToRGB(ftbTank.body.fillColor)) {
            errors.push('Unable to parse body color.');
        }
        
        // Validate tank barrels.
        const barrels = ftbTank.barrels;

        if (barrels.length === 0){
            errors.push('Unable to parse barrels.');
            return errors;
        }

        if (barrels.length > constants.MaxBarrels){
            errors.push(`Exceeded max number (${constants.MaxBarrels}) of gun barrels, drone makers, etc.`);
            return errors;
        }

        // Check max barrels allowed for each type of barrel.
        for (const barrelType of constants.ValidBarrelTypes){
            const maxBarrelPerType = maxBarrelPerTypeLookup.get(barrelType) || 1;
            const foundBarrelCount = barrels.filter(item => item.type === barrelType).length;

            if (foundBarrelCount > maxBarrelPerType){
                const barrelName = barrelNameLookup.get(barrelType) || 'Unknown barrel';
                errors.push(`${barrelName} (value: ${barrelType}) exceeded max barrel of ${maxBarrelPerType}.`);
            }
        }

        if (errors.length > 0){
            return errors;
        }        

        // Check for mutually exclusive turrets.
        const mutuallyExclusiveTypes = [];

        for (const barrel of barrels){
            const foundIndex = constants.MutuallyExclusiveBarrelTypes.findIndex((element) => element === barrel.type);
            
            if (foundIndex >= 0){
                mutuallyExclusiveTypes.push(barrel.type);
            }
        }

        if (mutuallyExclusiveTypes.length >= 2){
            errors.push(`Mutually exclusive barrel/turret types not allowed: ${mutuallyExclusiveTypes}.`);
            return errors;
        }  


        for (let barrel of barrels){
            // =========================================================
            // Barrel color currently not supported.
            // =========================================================
            // color (barrel color).
            // if (!hexToRGB(barrel.color)) {
            //     errors.push('Unable to parse barrel color.');
            // }            
            // =========================================================

            // bulletColor.
            if (!hexToRGB(barrel.bulletColor)) {
                const msg = `Unable to parse bullet color ${barrel.bulletColor}.`;
                // Don't add duplicate messages.
                if (errors.indexOf(msg) === -1){
                    errors.push(msg);
                }                
            }
            
            // type.            
            if (!isNumber(barrel.type)){
                const msg = 'type must be a number';

                if (errors.indexOf(msg) === -1){
                    errors.push(msg);
                }                
            }

            if (!constants.ValidBarrelTypes.includes(barrel.type)){
                const msg = `type must be one of the values in [${constants.ValidBarrelTypes}].`;

                if (errors.indexOf(msg) === -1){
                    errors.push(msg);
                }                
            }
            
            // angle.
            if (barrel.angle < constants.MinAngle || barrel.angle > constants.MaxAngle){
                const msg = `angle must be between ${constants.MinAngle} and ${constants.MaxAngle}.`;

                if (errors.indexOf(msg) === -1){
                    errors.push(msg);
                }                
            }

            // xoffset.
            if (barrel.xoffset < constants.MinBarrelOffset || barrel.xoffset > constants.MaxBarrelOffset){                
                const msg = `xoffset must be between ${constants.MinBarrelOffset} and ${constants.MaxBarrelOffset}.`;

                if (errors.indexOf(msg) === -1){
                    errors.push(msg);
                }                
            }

            // yoffset.
            if (barrel.yoffset < constants.MinBarrelOffset || barrel.yoffset > constants.MaxBarrelOffset){                
                const msg = `yoffset must be between ${constants.MinBarrelOffset} and ${constants.MaxBarrelOffset}.`;

                if (errors.indexOf(msg) === -1){
                    errors.push(msg);
                }                
            }
            
            // width.
            // if (barrel.width < constants.MinBarrelSize || barrel.width > constants.MaxBarrelSize){                
            //     const msg = `width must be between ${constants.MinBarrelSize} and ${constants.MaxBarrelSize}.`;

            //     if (errors.indexOf(msg) === -1){
            //         errors.push(msg);
            //     }                
            // }

            // baselength.
            // if (barrel.baselength < constants.MinBarrelSize || barrel.baselength > constants.MaxBarrelSize){                
            //     const msg = `baselength must be between ${constants.MinBarrelSize} and ${constants.MaxBarrelSize}.`;

            //     if (errors.indexOf(msg) === -1){
            //         errors.push(msg);
            //     }                
            // }

            // basedelay is ignored.
            // if (barrel.basedelay < constants.MinDelay || barrel.basedelay > constants.MaxDelay){                
            //     const msg = `basedelay must be between ${constants.MinDelay} and ${constants.MaxDelay}.`;

            //     if (errors.indexOf(msg) === -1){
            //         errors.push();
            //     }                
            // }

                        
            // knockback.
            // if (barrel.knockback < constants.MinKnockback || barrel.knockback > constants.MaxKnockback){                
            //     const msg = `knockback must be between ${constants.MinKnockback} and ${constants.MaxKnockback}.`;

            //     if (errors.indexOf(msg) === -1){
            //         errors.push(msg);
            //     }                
            // }

            // spread.
            // if (barrel.spread < constants.MinSpread || barrel.spread > constants.MaxSpread){                
            //     const msg = `spread must be between ${constants.MinSpread} and ${constants.MaxSpread}.`;

            //     if (errors.indexOf(msg) === -1){
            //         errors.push(msg);
            //     }                
            // }         

            // if (barrel.damage < constants.MinDamage || barrel.damage > constants.MaxDamage){                
            //     const msg = `damage must be between ${constants.MinDamage} and ${constants.MaxDamage}.`;

            //     if (errors.indexOf(msg) === -1){
            //         errors.push(msg);
            //     }                
            // }

            // reload.
            // if (barrel.basereload < constants.MinReload || barrel.basereload > constants.MaxReload){                
            //     const msg = `basereload must be between ${constants.MinReload} and ${constants.MaxReload}.`;

            //     if (errors.indexOf(msg) === -1){
            //         errors.push(msg);
            //     }                
            // }       
            // =========================================================   
        }                
    }
    catch (error){
        await logger.error(error);
        console.log(error);
        errors.push('Error validating FTB tank.');
    }

    return errors;
}

// ===============================================================================
async function convert (ftbCode, tankId, tankName) {
    try {
        const ftbTank = await parse(ftbCode, tankId, tankName);        

        if (!ftbTank){
            return null;
        }

        const errors = await validate(ftbTank);

        if (errors.length > 0){
            return null;
        }

        constructedExportsLookup.clear();
        
        // Projectiles exist as separate exports.
        const projectiles = [];

        // Guns and turrets will be embedded into the tank code.
        const guns = [];
        const turrets = [];        
        let maxChildren = 0;

        for (let barrel of ftbTank.barrels){
            const numChildren = maxChildrenLookup.get(barrel.type);
            if (numChildren){
                maxChildren += numChildren;
            }

            // Clamp the values.            
            barrel.angle = clamp(barrel.angle, constants.MinAngle, constants.MaxAngle);
            barrel.xoffset = clamp(barrel.xoffset, constants.MinBarrelOffset, constants.MaxBarrelOffset);
            barrel.yoffset = clamp(barrel.yoffset, constants.MinBarrelOffset, constants.MaxBarrelOffset);
            barrel.width = clamp(barrel.width, constants.MinBarrelSize, constants.MaxBarrelSize);
            barrel.baselength = clamp(barrel.baselength, constants.MinBarrelSize, constants.MaxBarrelSize);            
            barrel.knockback = clamp(barrel.knockback, constants.MinKnockback, constants.MaxKnockback);
            barrel.spread = clamp(barrel.spread, constants.MinSpread, constants.MaxSpread);            
            barrel.damage = clamp(barrel.damage, constants.MinDamage, constants.MaxDamage);
            barrel.basereload = clamp(barrel.basereload, constants.MinReload, constants.MaxReload);
            // ================================================================

            // add 60 degress adjustment to angle if barrel type is 1 (trap barrel) or 50 (auto turret, above body).
            // For example, "Defender".
            if (['triangle', 'pentagon'].includes(ftbTank.body.shape.toLowerCase()) && [1, 4, 50, 200].includes(barrel.type)){
                barrel.angle = +((barrel.angle + 60) % 360).toFixed(2);
            }
            else {
                barrel.angle = +(barrel.angle).toFixed(2);
            }
            
            // 2.95
            barrel.xoffset = +(barrel.xoffset / 2.95).toFixed(2);            
            barrel.yoffset = +(barrel.yoffset / 2.95).toFixed(2) * -1;            
            
            barrel.width = +(barrel.width / 2.825).toFixed(2);
            barrel.baselength = +(barrel.baselength / 2.825).toFixed(2);
            
            // basedelay is ignored.

            barrel.basereload = +(barrel.basereload / 60).toFixed(2);

            barrel.damage = +(barrel.damage / 20).toFixed(2);
            // knockback and spread are not supported yet.
            barrel.knockback = +(barrel.knockback * 1.5).toFixed(2);
            barrel.spread = +((barrel.spread % 31) / 3).toFixed(2);
             
            // Change default white barrel color to blue.
            if (barrel.color.toLowerCase() === '#ffffff'){
                barrel.color = '#00b2e1';
            }

            // Change default white bullet color to blue.
            if (barrel.bulletColor.toLowerCase() === '#ffffff'){
                // console.log('Changing default color to blue...');
                barrel.bulletColor = '#00b2e1';
            }
            
            // ===================================================================================
            // Construct projectiles (bullets etc) with custom color.
            // ===================================================================================
            const projectileConstructor = ProjectileConstructorLookup.get(barrel.type);            
            
            if (projectileConstructor){
                const projectileCode = await projectileConstructor(barrel, ftbTank);                
                projectiles.push(projectileCode);                
            }      

            // ===================================================================================
            // Construct barrel - gun, drone, trap, swarm, etc.
            // ===================================================================================
            const barrelConstructor = BarrelConstructorLookup.get(barrel.type);            
            
            if (barrelConstructor){
                const barrelCode = await barrelConstructor(barrel, ftbTank);                

                // Gun.
                if (constants.GunBarrelTypes.includes(barrel.type)){
                    guns.push(barrelCode);
                }
                // Auto turret.
                else if (constants.TurretBarrelTypes.includes(barrel.type)) {
                    turrets.push(barrelCode);
                }
            }
        }
        
        ftbTank.body.size = clamp(ftbTank.body.size, constants.MinBodySize, constants.MaxBodySize);        
        ftbTank.body.size = +(ftbTank.body.size / constants.FTBToArrasBodyRatio).toFixed(2);
        
        const bodyShapeValue = bodyShapeValueLookup.get(ftbTank.body.shape);

        // For smasher, landmine, dominator, etc.        
        const bodyTurretCode = bodyTurretLookup[ftbTank.body.shape];
        if (bodyTurretCode){
            turrets.push(bodyTurretCode);
        }        
                
        const isSmasher = false; // constants.RamBodyShapes.includes(ftbTank.body.shape);
        
        const projectilesCode = projectiles.join('\n');

        // =======================================================================================
        // Landmine can cloak if it does not have auto turrets.
        // =======================================================================================
        const nonGunBarrels = ftbTank.barrels.filter(barrel => {
            return constants.NonGunBarrelTypes.includes(barrel.type);
        });
          
        const canCloak = (ftbTank.body.shape.toLowerCase() === 'landmine' && nonGunBarrels.length === 0);
        // =======================================================================================

        const minOpacity = canCloak ? 0 : 1;

        // The apostrophe will cause "Unexpected identifier" error.
        tankName = tankName.replace("'", "\\'");


        let canZoom = 0;
        const zoomBarrelIndex = ftbTank.barrels.findIndex(barrel => barrel.type === constants.ZoomAbilityGunBarrelType);

        if (zoomBarrelIndex >= 0){
            canZoom = 1;
        }

        let tankCode = `exports.${ftbTank.id} = {
            CUSTOM: true,
            PARENT: [exports.genericTank],
            LABEL: '${tankName}',
            SIZE: ${ftbTank.body.size},
            SHAPE: ${bodyShapeValue},
            IS_SMASHER: ${isSmasher},
            COLOR: '${ftbTank.body.fillColor}',
            CAN_CLOAK: ${canCloak},
            MIN_OPACITY: ${minOpacity},
            MAX_CHILDREN: ${maxChildren},
            CAN_ZOOM: ${canZoom},
            BODY: {            
                SPEED: base.SPEED * 1.2,
                FOV: base.FOV * 1.1
            },                               
            GUNS: [${guns.join(',')}],
            TURRETS: [${turrets.join(',')}]
        };`;
        
        return projectilesCode + tankCode;
    }
    catch (error){
        await logger.error(error);
    }

    return null;
}


async function constructBulletGunBarrel (barrel, tank) {    
    // LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY    
    let props = '';
        
    // 'disabled' property sometimes does not work in FTB. Ignoring it for now.
    //if (!barrel.disabled)
    {
        props = `PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.slow, g.power, g.lessreload, ${getBarrelStats(barrel)}]),
            TYPE: exports.${tank.id}_bullet_${stripHash(barrel.bulletColor)},            
        }`;        
    }

    const code = `{
        POSITION: [${barrel.baselength}, ${barrel.width}, 1, ${barrel.xoffset}, ${barrel.yoffset}, ${barrel.angle}, 0, ],
        GUN_COLOR: '${barrel.color}',
        ${props}
    }`;    

    return code;
}


async function constructTrapBarrel (barrel, tank) {    
    // LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY            
    const code = `{
            POSITION: [14, 8, 1, 0, 0, ${barrel.angle}, 0, ],
            GUN_COLOR: '${barrel.color}',
        },
        {
            POSITION: [4, 8, 1.5, 14, 0, ${barrel.angle}, 0, ],
            GUN_COLOR: '${barrel.color}',
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.halfreload, ${getBarrelStats(barrel)}]),
                TYPE: exports.${tank.id}_trap_${stripHash(barrel.bulletColor)},
                STAT_CALCULATOR: gunCalcNames.trap,
            }
        }`;
    
    return code;    
}

async function constructDroneBarrel (barrel, tank) {    
    // LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY    
    const code = `{        
        POSITION: [6, 12, 1.2, 8, 0, ${barrel.angle}, 0, ],
        GUN_COLOR: '${barrel.color}',
        PROPERTIES: {            
            SHOOT_SETTINGS: combineStats([g.drone, g.over, ${getBarrelStats(barrel)}]),
            TYPE: exports.${tank.id}_drone_${stripHash(barrel.bulletColor)},            
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: gunCalcNames.drone,
            WAIT_TO_CYCLE: true,
            MAX_CHILDREN: 2
        }
    }`;
    
    return code;
}

async function constructNecroBarrel (barrel, tank) {    
    // LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY    
    const code = `{        
        POSITION: [5, 12, 1.2, 8, 0, ${barrel.angle}, 0, ],
        GUN_COLOR: '${barrel.color}',
        PROPERTIES: {            
            SHOOT_SETTINGS: combineStats([g.drone, g.sunchip, g.triplereload, ${getBarrelStats(barrel)}]),
            TYPE: exports.${tank.id}_sunchip_${stripHash(barrel.bulletColor)},
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: gunCalcNames.necro,   
            MAX_CHILDREN: 2
        }
    }`;
    
    return code;
}

async function constructBelowBodyAutoTurret (barrel, tank) {       
    // SIZE     X       Y     ANGLE    ARC    
    const code = `{
        POSITION: [${barrel.width}, 10, ${barrel.yoffset}, ${barrel.angle}, 180, 0],
        TURRET_COLOR: '${barrel.color}',
        TYPE: [exports.${tank.id}_heavy3gun_${stripHash(barrel.bulletColor)}, {
            CONTROLLERS: ['nearestDifferentMaster'],
            INDEPENDENT: true,            
        }]
    }`;
    
    return code;
}

async function constructAboveBodyAutoTurret (barrel, tank) {           
    let xoffset = 8;

    if (tank.body.shape.toLowerCase() === 'triangle'){
        xoffset = +(tank.body.size / 12).toFixed(2);
    }

    // SIZE     X       Y     ANGLE    ARC        
    const code = `{
        POSITION: [${barrel.width}, ${xoffset}, ${barrel.yoffset}, ${barrel.angle}, 180, 1], 
        TURRET_COLOR: '${barrel.color}',       
        TYPE: [exports.${tank.id}_heavy3gun_${stripHash(barrel.bulletColor)}, {
            CONTROLLERS: ['nearestDifferentMaster'],
            INDEPENDENT: true,

        }]
    }`;
    
    return code;
}

async function constructMinionBarrel (barrel, tank) {
    // LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY
    const code = `{        
        POSITION: [6, 12, 1.2, 8, 0, ${barrel.angle}, 0, ],
        GUN_COLOR: '${barrel.color}',
        PROPERTIES: {            
            SHOOT_SETTINGS: combineStats([g.factory, ${getBarrelStats(barrel)}]),
            TYPE: exports.${tank.id}_minion_${stripHash(barrel.bulletColor)},
            STAT_CALCULATOR: gunCalcNames.drone,
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            VARIES_IN_SIZE: false,
            MAX_CHILDREN: 1
        }
    }`;

    return code;    
}

async function constructSwarmBarrel (barrel, tank) {
    // LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY
    const code = `{        
        POSITION: [7, 7.5, 0.6, 7, 4, ${barrel.angle}, 0, ],
        GUN_COLOR: '${barrel.color}',
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.swarm, g.lessreload, ${getBarrelStats(barrel)}]),
            TYPE: exports.${tank.id}_autoswarm_${stripHash(barrel.bulletColor)},
            STAT_CALCULATOR: gunCalcNames.swarm,
            LABEL: 'Autonomous',
        }
    }`;

    return code;
}


async function constructBelowBodyBigAuto4GunTurretContainer (barrel, tank) {
    // SIZE     X       Y     ANGLE    ARC    
    const code = `{
        POSITION: [${barrel.width}, 10, ${barrel.yoffset}, ${barrel.angle}, 90, 0],
        TURRET_COLOR: '${barrel.color}',
        TYPE: [exports.${tank.id}_bigauto4gun_${stripHash(barrel.bulletColor)}, {
            CONTROLLERS: ['nearestDifferentMaster'],
            INDEPENDENT: true,
        }]
    }`;
    
    return code;
}

async function constructMissileGunBarrel (barrel, tank) {    
    // LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY
    const code = `{
        POSITION: [${barrel.baselength}, ${barrel.width}, 1, ${barrel.xoffset}, ${barrel.yoffset}, ${barrel.angle}, 0, ],
        GUN_COLOR: '${barrel.color}',
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.pound, g.destroy, g.anni, g.morespeed, g.skim, ${getBarrelStats(barrel)}]),            
            TYPE: exports.${tank.id}_missile_${stripHash(barrel.bulletColor)},
        }
    }`;    

    return code;
}

// ===================================================================
// Projectiles.
// ===================================================================
const constructedExportsLookup = new Map();

async function constructGunBullet (barrel, tank) {
    const exportName = `${tank.id}_bullet_${stripHash(barrel.bulletColor)}`;

    if (constructedExportsLookup.get(exportName)){
        return null;
    }    

    // Bullet with custom color.
    let code = `exports.${exportName} = {
        PARENT: [exports.bullet],
        COLOR: '${barrel.bulletColor}',
    };`;
   
    constructedExportsLookup.set(exportName, code);

    return code;
}

async function constructTrap (barrel, tank) {
    const exportName = `${tank.id}_trap_${stripHash(barrel.bulletColor)}`;

    if (constructedExportsLookup.get(exportName)){
        return null;
    }    

    // Trap with custom color.
    let code = `exports.${exportName} = {
        PARENT: [exports.trap],
        COLOR: '${barrel.bulletColor}',
    };`;

    constructedExportsLookup.set(exportName, code);
   
    return code;
}

async function constructDrone (barrel, tank) {
    const exportName = `${tank.id}_drone_${stripHash(barrel.bulletColor)}`;

    if (constructedExportsLookup.get(exportName)){
        return null;
    }    

    // Drone with custom color.
    let code = `exports.${exportName} = {
        PARENT: [exports.drone],
        COLOR: '${barrel.bulletColor}',
    };`;

    constructedExportsLookup.set(exportName, code);
   
    return code;
}

async function constructNecro (barrel, tank) {
    const exportName = `${tank.id}_sunchip_${stripHash(barrel.bulletColor)}`;

    if (constructedExportsLookup.get(exportName)){
        return null;
    }    

    // Sunchip with custom color.
    let code = `exports.${exportName} = {
        PARENT: [exports.summonersunchip],
        COLOR: '${barrel.bulletColor}',
    };`;

    constructedExportsLookup.set(exportName, code);
   
    return code;
}


async function constructHeavy3GunBullet (barrel, tank) {
    const codes = [];

    // ==============================================================================
    // Heavy3Gun bullet with custom color.
    // ==============================================================================
    const bulletExportName = `${tank.id}_heavy3gun_bullet_${stripHash(barrel.bulletColor)}`;

    if (!constructedExportsLookup.get(bulletExportName)){        
        const bulletCode = `exports.${bulletExportName} = {
            PARENT: [exports.bullet],
            COLOR: '${barrel.bulletColor}',
        };`;

        codes.push(bulletCode);
        constructedExportsLookup.set(bulletExportName, bulletCode);
    }

    // ==============================================================================
    // Heavy3Gun with custom color.
    // ==============================================================================
    const gunExportName = `${tank.id}_heavy3gun_${stripHash(barrel.bulletColor)}`;

    if (!constructedExportsLookup.get(gunExportName)){        
        const gunCode = `exports.${gunExportName} = {
            PARENT: [exports.heavy3gun], 
            COLOR: '${barrel.color}',       
            GUNS: [{
                POSITION: [22, 14, 1, 0, 0, 0, 0, ],
                GUN_COLOR: '${barrel.color}',
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.basic, g.pound, g.auto, g.sniper, g.almostNoRecoil, g.lessreload]),
                    TYPE: exports.${bulletExportName},
                },
            }],
        };`;

        codes.push(gunCode);
        constructedExportsLookup.set(gunExportName, gunCode);
    }
   
    return codes.join(';');
}


async function constructMinion (barrel, tank) {    
    const codes = [];

    // ==============================================================================
    // Minion bullet with custom color.
    // ==============================================================================
    const bulletExportName = `${tank.id}_minion_bullet_${stripHash(barrel.bulletColor)}`;

    if (!constructedExportsLookup.get(bulletExportName)){        
        const bulletCode = `exports.${bulletExportName} = {
            PARENT: [exports.bullet],
            COLOR: '${barrel.bulletColor}',
        };`;

        codes.push(bulletCode);
        constructedExportsLookup.set(bulletExportName, bulletCode);
    }

    // ==============================================================================
    // Minion with custom color.
    // ==============================================================================
    const minionExportName = `${tank.id}_minion_${stripHash(barrel.bulletColor)}`;

    if (!constructedExportsLookup.get(minionExportName)){        
        const minionCode = `exports.${minionExportName} = {
            PARENT: [exports.minion],
            COLOR: '${barrel.bulletColor}',
            GUNS: [{
                POSITION: [17, 9, 1, 0, 0, 0, 0, ],
                GUN_COLOR: '${barrel.color}',
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.basic, g.minion, g.almostNoRecoil, g.halfreload]),
                    WAIT_TO_CYCLE: true,
                    SYNCS_SKILLS: true,
                    TYPE: exports.${bulletExportName},
                },
            }, ],        
        };`;

        codes.push(minionCode);
        constructedExportsLookup.set(minionExportName, minionCode);
    }
   
    return codes.join(';');
}

async function constructSwarm (barrel, tank) {
    const exportName = `${tank.id}_autoswarm_${stripHash(barrel.bulletColor)}`;

    if (constructedExportsLookup.get(exportName)){
        return null;
    }    

    // Swarm with custom color.
    let code = `exports.${exportName} = {
        PARENT: [exports.autoswarm],
        COLOR: '${barrel.bulletColor}',
    };`;

    constructedExportsLookup.set(exportName, code);
   
    return code;
}


async function constructBigAuto4GunTurret (barrel, tank) {        
    const codes = [];

    // ==============================================================================
    // BigAuto4Gun bullet with custom color.
    // ==============================================================================
    const bulletExportName = `${tank.id}_bigauto4gun_bullet_${stripHash(barrel.bulletColor)}`;

    if (!constructedExportsLookup.get(bulletExportName)){        
        const bulletCode = `exports.${bulletExportName} = {
            PARENT: [exports.bullet],
            COLOR: '${barrel.bulletColor}',
        };`;

        codes.push(bulletCode);
        constructedExportsLookup.set(bulletExportName, bulletCode);
    }

    // ==============================================================================
    // BigAuto4Gun with custom color.
    // ==============================================================================
    const bigAuto4GunExportName = `${tank.id}_bigauto4gun_${stripHash(barrel.bulletColor)}`;

    if (!constructedExportsLookup.get(bigAuto4GunExportName)){        
        const bigAuto4GunCode = `exports.${bigAuto4GunExportName} = {
            PARENT: [exports.bigauto4gun], 
            COLOR: '${barrel.color}',
            GUNS: [{
                POSITION: [14, 5, 1, 0, -4.5, 0, 0, ],
                GUN_COLOR: '${barrel.color}',
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.basic, g.auto, g.sniper, g.slow, g.almostNoRecoil]),
                    TYPE: exports.${bulletExportName},
                },
            }, {
                POSITION: [14, 5, 1, 0, 4.5, 0, 0.25, ],
                GUN_COLOR: '${barrel.color}',
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.basic, g.auto, g.sniper, g.slow, g.almostNoRecoil]),
                    TYPE: exports.${bulletExportName},
                },
            }, {
                POSITION: [16, 5, 1, 0, 0, 0, 0.5, ],
                GUN_COLOR: '${barrel.color}',
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.basic, g.auto, g.sniper, g.slow, g.almostNoRecoil]),
                    TYPE: exports.${bulletExportName},
                },
            }],
        };`;

        codes.push(bigAuto4GunCode);
        constructedExportsLookup.set(bigAuto4GunExportName, bigAuto4GunCode);
    }
   
    return codes.join(';');
}


async function constructMissileBarrel (barrel, tank) {        
    const codes = [];

    // ==============================================================================
    // Missile bullet with custom color.
    // ==============================================================================
    const bulletExportName = `${tank.id}_missile_bullet_${stripHash(barrel.bulletColor)}`;

    if (!constructedExportsLookup.get(bulletExportName)){        
        const bulletCode = `exports.${bulletExportName} = {
            PARENT: [exports.extremelyShortLivedBullet],
            COLOR: '${barrel.bulletColor}',
        };`;

        codes.push(bulletCode);
        constructedExportsLookup.set(bulletExportName, bulletCode);
    }

    // ==============================================================================
    // Missile with custom color.
    // ==============================================================================
    const missileExportName = `${tank.id}_missile_${stripHash(barrel.bulletColor)}`;         

    if (!constructedExportsLookup.get(missileExportName)){        
       
        const missileCode = `exports.${missileExportName} = {
            PARENT: [exports.missile],
            COLOR: '${barrel.bulletColor}',
            GUNS: [{
                POSITION: [14, 6, 1, 0, -2, 130, 0, ],
                GUN_COLOR: '${barrel.color}',
                PROPERTIES: {
                    AUTOFIRE: false,                            
                    SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.muchmorerecoil, g.morespeed, g.halfreload]),        
                    TYPE: [exports.${bulletExportName}, {
                        PERSISTS_AFTER_DEATH: true,
                    }],
                    STAT_CALCULATOR: gunCalcNames.thruster,
                },
            }, {
                POSITION: [14, 6, 1, 0, 2, 230, 0, ],
                GUN_COLOR: '${barrel.color}',
                PROPERTIES: {
                    AUTOFIRE: false,                            
                    SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.muchmorerecoil, g.morespeed, g.halfreload]),        
                    TYPE: [exports.${bulletExportName}, {
                        PERSISTS_AFTER_DEATH: true,
                    }],
                    STAT_CALCULATOR: gunCalcNames.thruster,
                },
            }, ],
        };`;

        codes.push(missileCode);
        constructedExportsLookup.set(missileExportName, missileCode);
    }
   
    return codes.join(';');
}

async function constructPillbox (barrel, tank) {
    const codes = [];

    // ==============================================================================
    // Pillbox turret bullet with custom color.
    // ==============================================================================
    const bulletExportName = `${tank.id}_pillbox_turret_bullet_${stripHash(barrel.bulletColor)}`;

    if (!constructedExportsLookup.get(bulletExportName)){        
        const bulletCode = `exports.${bulletExportName} = {
            PARENT: [exports.shortLivedBullet],
            COLOR: '${barrel.bulletColor}',
        };`;

        codes.push(bulletCode);
        constructedExportsLookup.set(bulletExportName, bulletCode);
    }

    // ==============================================================================
    // Pillbox turret with custom color.
    // ==============================================================================
    const pillboxTurretExportName = `${tank.id}_pillbox_turret_${stripHash(barrel.bulletColor)}`;

    if (!constructedExportsLookup.get(pillboxTurretExportName)){        
        const pillboxTurretCode = `exports.${pillboxTurretExportName} = {
            PARENT: [exports.pillboxTurret],        
            COLOR: '${barrel.bulletColor}',
            GUNS: [{
                POSITION: [22, 11, 1, 0, 0, 0, 0, ],
                GUN_COLOR: '${barrel.color}',
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.basic, g.turret, g.power, g.sniper, g.slow]),                    
                    TYPE: exports.${bulletExportName},
                },
            }, ],        
        };`;
        
        codes.push(pillboxTurretCode);
        constructedExportsLookup.set(pillboxTurretExportName, pillboxTurretCode);
    }

    // ==============================================================================
    // Pillbox with custom color.
    // ==============================================================================
    const pillboxExportName = `${tank.id}_pillbox_${stripHash(barrel.bulletColor)}`;

    if (!constructedExportsLookup.get(pillboxExportName)){        
        const pillboxCode = `exports.${pillboxExportName} = {
            PARENT: [exports.pillbox],        
            COLOR: '${barrel.bulletColor}',
            TURRETS: [{
                POSITION: [11, 0, 0, 0, 360, 1],
                TYPE: exports.${pillboxTurretExportName},
            }]
        };`;
        
        codes.push(pillboxCode);
        constructedExportsLookup.set(pillboxExportName, pillboxCode);
    }
   
    return codes.join(';');
}

async function constructPillboxGunBarrel (barrel, tank) {    
    // LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY             
    const code = `{        
            POSITION: [5, 11, 1, 10.5, ${barrel.yoffset}, ${barrel.angle}, 0, ],
            GUN_COLOR: '${barrel.color}',
        }, {
            POSITION: [3, 14, 1, 15.5, ${barrel.yoffset}, ${barrel.angle}, 0, ],
            GUN_COLOR: '${barrel.color}',
        }, {
            POSITION: [2, 14, 1.3, 18, ${barrel.yoffset}, ${barrel.angle}, 0, ],
            GUN_COLOR: '${barrel.color}',
            PROPERTIES: {
                MAX_CHILDREN: 1,
                SHOOT_SETTINGS: combineStats([g.trap, g.block, g.lessreload, ${getBarrelStats(barrel)}]),
                TYPE: exports.${tank.id}_pillbox_${stripHash(barrel.bulletColor)},
                SYNCS_SKILLS: true,
            },
        }, {
            POSITION: [4, 14, 1, 8, 0, ${barrel.angle}, 0, ],
            GUN_COLOR: '${barrel.color}',
        }`;
    
    return code;    
}

async function constructRotatingMissileBarrel (barrel, tank) {        
    const codes = [];

    // ==============================================================================
    // Rotating missile bullet with custom color.
    // ==============================================================================
    const bulletExportName = `${tank.id}_rotating_missile_bullet_${stripHash(barrel.bulletColor)}`;

    if (!constructedExportsLookup.get(bulletExportName)){        
        const bulletCode = `exports.${bulletExportName} = {
            PARENT: [exports.extremelyShortLivedBullet],
            COLOR: '${barrel.bulletColor}',
        };`;

        codes.push(bulletCode);
        constructedExportsLookup.set(bulletExportName, bulletCode);
    }

    // ==============================================================================
    // Rotating missile with custom color.
    // ==============================================================================
    const missileExportName = `${tank.id}_rotating_missile_${stripHash(barrel.bulletColor)}`;         

    if (!constructedExportsLookup.get(missileExportName)){
        const missileCode = `exports.${missileExportName} = {
            PARENT: [exports.rotatingMissile],
            COLOR: '${barrel.bulletColor}',            
            GUNS: [{
                    POSITION: [14, 6, 1, 0, 0, 90, 0, ],
                    GUN_COLOR: '${barrel.color}',
                    PROPERTIES: {
                        AUTOFIRE: true,
                        SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.almostNoRecoil, g.lessreload]),
                        TYPE: [exports.${bulletExportName}, {
                            PERSISTS_AFTER_DEATH: true,
                        }],
                        STAT_CALCULATOR: gunCalcNames.thruster,
                    },
                }, {
                    POSITION: [14, 6, 1, 0, 0, 270, 0, ],
                    GUN_COLOR: '${barrel.color}',
                    PROPERTIES: {
                        AUTOFIRE: true,
                        SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.twin, g.almostNoRecoil, g.lessreload]),                
                        TYPE: [exports.${bulletExportName}, {
                            PERSISTS_AFTER_DEATH: true,
                        }],
                        STAT_CALCULATOR: gunCalcNames.thruster,
                    },
                },
            ],
        };`;

        codes.push(missileCode);
        constructedExportsLookup.set(missileExportName, missileCode);
    }
   
    return codes.join(';');
}

async function constructRotatingMissileGunBarrel (barrel, tank) {    
    // LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY
    const subBarrel = {
        length: barrel.baselength * 0.588235,
        width: barrel.width * 0.933,
        xoffset: barrel.xoffset + 9,
        yoffset: barrel.yoffset,
        angle: barrel.angle
    };
      
    const code = `{
        POSITION: [10, 14, -0.5, ${subBarrel.xoffset}, ${subBarrel.yoffset}, ${subBarrel.angle}, 0, ],
        GUN_COLOR: '${barrel.color}',
    }, {
        POSITION: [17, 15, 1, ${barrel.xoffset}, ${barrel.yoffset}, ${barrel.angle}, 0, ],        
        GUN_COLOR: '${barrel.color}',
        PROPERTIES: {            
            SHOOT_SETTINGS: combineStats([g.basic, g.pound, g.destroy, g.halfreload, g.almostNoRecoil]),
            TYPE: exports.${tank.id}_rotating_missile_${stripHash(barrel.bulletColor)},
            STAT_CALCULATOR: gunCalcNames.sustained,
        },
    }`;                

    return code;
}


async function constructPentagon (barrel, tank) {
    const exportName = `${tank.id}_pentagon_${stripHash(barrel.bulletColor)}`;

    if (constructedExportsLookup.get(exportName)){
        return null;
    }    

    // Pentagon drone with custom color.
    let code = `exports.${exportName} = {
        PARENT: [exports.pentagonSummonerSunchip],
        COLOR: '${barrel.bulletColor}',
    };`;

    constructedExportsLookup.set(exportName, code);   
    return code;
}

async function constructPentagonBarrel (barrel, tank) {    
    // LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY    

    const code = `{
        POSITION: [12, 9, 1, ${barrel.xoffset}, ${barrel.yoffset}, ${barrel.angle}, 0, ],
        GUN_COLOR: '${barrel.color}',
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.summonersunchip, ${getBarrelStats(barrel)}]),
            TYPE: exports.${tank.id}_pentagon_${stripHash(barrel.bulletColor)},
            AUTOFIRE: false,
            SYNCS_SKILLS: true,
            MAX_CHILDREN: 1,
            STAT_CALCULATOR: gunCalcNames.necro, 
        }
    }`;
    
    return code;
}


async function constructSquareMinion (barrel, tank) {    
    const codes = [];

    // ==============================================================================
    // Square Minion bullet with custom color.
    // ==============================================================================
    const bulletExportName = `${tank.id}_square_minion_bullet_${stripHash(barrel.bulletColor)}`;

    if (!constructedExportsLookup.get(bulletExportName)){        
        const bulletCode = `exports.${bulletExportName} = {
            PARENT: [exports.bullet],
            COLOR: '${barrel.bulletColor}',
        };`;

        codes.push(bulletCode);
        constructedExportsLookup.set(bulletExportName, bulletCode);
    }

    // ==============================================================================
    // Square Minion with custom color.
    // ==============================================================================
    const minionExportName = `${tank.id}_square_minion_${stripHash(barrel.bulletColor)}`;

    if (!constructedExportsLookup.get(minionExportName)){        
        const minionCode = `exports.${minionExportName} = {
            PARENT: [exports.constructionistMinion],
            COLOR: '${barrel.bulletColor}',
            GUNS: 
            [
                {
                    POSITION: [19, 8, 1, 0, 0, 0, 0, ],
                    GUN_COLOR: '${barrel.color}',
                    PROPERTIES: {
                        SHOOT_SETTINGS: combineStats([g.basic, g.minion, g.halfreload]),                                                
                        WAIT_TO_CYCLE: true,
                        SYNCS_SKILLS: true,
                        TYPE: exports.${bulletExportName},
                    },
                }, 
                {
                    POSITION: [5.5, 8, -1.8, 6.5, 0, 0, 0, ],
                },
            ],
        };`;

        codes.push(minionCode);
        constructedExportsLookup.set(minionExportName, minionCode);
    }
   
    return codes.join(';');
}


async function constructSquareMinionBarrel (barrel, tank) {
    // LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY
    const code = `{
        POSITION: [6, 12, 1.2, 8, 0, ${barrel.angle}, 0, ],
        GUN_COLOR: '${barrel.color}',
        PROPERTIES: 
        {
            SHOOT_SETTINGS: combineStats([g.factory, ${getBarrelStats(barrel)}]),
            TYPE: exports.${tank.id}_square_minion_${stripHash(barrel.bulletColor)},
            STAT_CALCULATOR: gunCalcNames.drone,
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            MAX_CHILDREN: 1
        }
    }`;

    return code;    
}

async function constructCenterBodyAutoTwinTurret (barrel, tank) {
    const codes = [];

    // ==============================================================================
    // Auto Twin Turret bullet with custom color.
    // ==============================================================================
    const bulletExportName = `${tank.id}_auto_twin_turret_bullet_${stripHash(barrel.bulletColor)}`;

    if (!constructedExportsLookup.get(bulletExportName)){        
        const bulletCode = `exports.${bulletExportName} = {
            PARENT: [exports.bullet],
            COLOR: '${barrel.bulletColor}',
        };`;

        codes.push(bulletCode);
        constructedExportsLookup.set(bulletExportName, bulletCode);
    }

    // ==============================================================================
    // Auto Twin Turret with custom color.
    // ==============================================================================
    const gunExportName = `${tank.id}_auto_twin_turret_${stripHash(barrel.bulletColor)}`;

    if (!constructedExportsLookup.get(gunExportName)){            
        const gunCode = `exports.${gunExportName} = {
            PARENT: [exports.autoTwinTurret], 
            COLOR: '${barrel.color}',
            GUNS: [{ 
                POSITION: [20, 6, 1, 0, 5, 0, 0, ],
                GUN_COLOR: '${barrel.color}',
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.basic, g.gunner, g.power, g.sniper, g.slow, g.halfreload, g.almostNoRecoil]),
                    TYPE: exports.${bulletExportName},
                    STAT_CALCULATOR: gunCalcNames.fixedReload,
                },
            }, {
                POSITION: [20, 6, 1, 0, -5, 0, 0.5, ],
                GUN_COLOR: '${barrel.color}',
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.basic, g.gunner, g.power, g.sniper, g.slow, g.halfreload, g.almostNoRecoil]),
                    TYPE: exports.${bulletExportName},
                    STAT_CALCULATOR: gunCalcNames.fixedReload,
                },
            }, ]
        };`;

        codes.push(gunCode);
        constructedExportsLookup.set(gunExportName, gunCode);
    }    
    // ==============================================================================
   
    return codes.join(';');
}


async function constructCenterBodyAutoTwinTurretContainer (barrel, tank) {
    // SIZE     X       Y     ANGLE    ARC        
    const code = `{        
        POSITION: [11, 0, 0, 0, 360, 1, ],
        TURRET_COLOR: '${barrel.color}',       
        TYPE: [exports.${tank.id}_auto_twin_turret_${stripHash(barrel.bulletColor)}, {
            CONTROLLERS: ['nearestDifferentMaster'],
            INDEPENDENT: true
        }],
    }`;
    
    return code;
}


async function constructCenterBodySniperTurret(barrel, tank) {
    const codes = [];

    // ==============================================================================
    // Sniper Turret bullet with custom color.
    // ==============================================================================
    const bulletExportName = `${tank.id}_sniper_turret_bullet_${stripHash(barrel.bulletColor)}`;

    if (!constructedExportsLookup.get(bulletExportName)){        
        const bulletCode = `exports.${bulletExportName} = {
            PARENT: [exports.bullet],
            COLOR: '${barrel.bulletColor}',
        };`;

        codes.push(bulletCode);
        constructedExportsLookup.set(bulletExportName, bulletCode);
    }

    // ==============================================================================
    // Sniper Turret with custom color.
    // ==============================================================================
    const gunExportName = `${tank.id}_sniper_turret_${stripHash(barrel.bulletColor)}`;

    if (!constructedExportsLookup.get(gunExportName)){        
        const gunCode = `exports.${gunExportName} = {
            PARENT: [exports.sniperTurret], 
            COLOR: '${barrel.color}',            
            GUNS: [{
                POSITION: [27, 9, 1, 0, 0, 0, 0, ],
                GUN_COLOR: '${barrel.color}',
                PROPERTIES: {            
                    SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.assass, g.almostNoRecoil, g.tadmorereload]),
                    TYPE: exports.${bulletExportName},
                },
            }, {
                POSITION: [5, 9, -1.5, 8, 0, 0, 0, ],
                GUN_COLOR: '${barrel.color}',
            }, ]
        };`;

        codes.push(gunCode);
        constructedExportsLookup.set(gunExportName, gunCode);
    }
   
    return codes.join(';');
}


async function constructCenterBodySniperTurretContainer (barrel, tank) {
    // SIZE     X       Y     ANGLE    ARC        
    const code = `{
        POSITION: [11, 0, 0, 0, 360, 1, ],
        TURRET_COLOR: '${barrel.color}',
        TYPE: [exports.${tank.id}_sniper_turret_${stripHash(barrel.bulletColor)}, {            
            INDEPENDENT: true,            
        }]
    }`;
    
    return code;
}


async function constructPredatorGunBullet (barrel, tank) {
    const exportName = `${tank.id}_predator_bullet_${stripHash(barrel.bulletColor)}`;

    if (constructedExportsLookup.get(exportName)){
        return null;
    }    

    // Bullet with custom color.
    let code = `exports.${exportName} = {
        PARENT: [exports.longRangeBullet],
        COLOR: '${barrel.bulletColor}',
    };`;
   
    constructedExportsLookup.set(exportName, code);

    return code;
}


async function constructPredatorGunBarrel (barrel, tank) {    
    // LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY
    const code = `{
        POSITION: [24, 12, 1, ${barrel.xoffset}, ${barrel.yoffset}, ${barrel.angle}, 0, ],
        GUN_COLOR: '${barrel.color}',
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.sniper, g.hunter, g.preda, g.lessreload, g.almostNoRecoil]),
            TYPE: exports.${tank.id}_predator_bullet_${stripHash(barrel.bulletColor)},
        },
    }, {
        POSITION: [21, 15, 1, ${barrel.xoffset}, ${barrel.yoffset}, ${barrel.angle}, 0.15, ],
        GUN_COLOR: '${barrel.color}',
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.sniper, g.hunter, g.preda, g.lessreload, g.almostNoRecoil]),
            TYPE: exports.${tank.id}_predator_bullet_${stripHash(barrel.bulletColor)},
        },
    }, {
        POSITION: [18, 18, 1, ${barrel.xoffset}, ${barrel.yoffset}, ${barrel.angle}, 0.3, ],
        GUN_COLOR: '${barrel.color}',
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.sniper, g.hunter, g.preda, g.lessreload, g.almostNoRecoil]),
            TYPE: exports.${tank.id}_predator_bullet_${stripHash(barrel.bulletColor)},
        },
    }`;    

    return code;
}


async function constructCenterBodyBigAuto4GunTurretContainer (barrel, tank) {
    // SIZE     X       Y     ANGLE    ARC    
    const code = `{
        POSITION: [11, 0, 0, 0, 360, 1, ],
        TURRET_COLOR: '${barrel.color}',       
        TYPE: [exports.${tank.id}_bigauto4gun_${stripHash(barrel.bulletColor)}, {            
            INDEPENDENT: true,                
        }]
    }`;
    
    return code;
}


async function constructBoomerang (barrel, tank) {
    const exportName = `${tank.id}_boomerang_${stripHash(barrel.bulletColor)}`;

    if (constructedExportsLookup.get(exportName)){
        return null;
    }    

    // Trap with custom color.
    let code = `exports.${exportName} = {
        PARENT: [exports.boomerang],
        COLOR: '${barrel.bulletColor}',
    };`;

    constructedExportsLookup.set(exportName, code);
   
    return code;
}

async function constructBoomerangBarrelContainer (barrel, tank) {    
    // LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY            
    const code = `{
            POSITION: [5, 10, 1, 14, ${barrel.yoffset}, ${barrel.angle}, 0, ],
            GUN_COLOR: '${barrel.color}',
        }, {
            POSITION: [6, 10, -1.5, 7, ${barrel.yoffset}, ${barrel.angle}, 0, ],
            GUN_COLOR: '${barrel.color}',
        }, {            
            POSITION: [2, 10, 1.3, 18, ${barrel.yoffset}, ${barrel.angle}, 0, ],
            GUN_COLOR: '${barrel.color}',
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.block, g.boomerang, ${getBarrelStats(barrel)}]),
                TYPE: exports.${tank.id}_boomerang_${stripHash(barrel.bulletColor)},
            },
        }`;
    
    return code;    
}


async function constructBlock (barrel, tank) {
    const exportName = `${tank.id}_block_${stripHash(barrel.bulletColor)}`;

    if (constructedExportsLookup.get(exportName)){
        return null;
    }    

    // Block with custom color.
    let code = `exports.${exportName} = {
        PARENT: [exports.block],
        COLOR: '${barrel.bulletColor}',
    };`;

    constructedExportsLookup.set(exportName, code);
   
    return code;
}

async function constructBlockBarrelContainer (barrel, tank) {    
    // LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY            
    const code = `{
            POSITION: [18, 12, 1, 0, ${barrel.yoffset}, ${barrel.angle}, 0, ],
            GUN_COLOR: '${barrel.color}',
        }, {
            POSITION: [2, 12, 1.1, 18, ${barrel.yoffset}, ${barrel.angle}, 0, ],
            GUN_COLOR: '${barrel.color}',
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.block, g.halfreload, ${getBarrelStats(barrel)}]),
                TYPE: exports.${tank.id}_block_${stripHash(barrel.bulletColor)},
            },
        }`;
    
    return code;    
}

async function constructRocketBarrel (barrel, tank) {        
    const codes = [];

    // ==============================================================================
    // Rocket bullet with custom color.
    // ==============================================================================
    const bulletExportName = `${tank.id}_rocket_bullet_${stripHash(barrel.bulletColor)}`;

    if (!constructedExportsLookup.get(bulletExportName)){        
        const bulletCode = `exports.${bulletExportName} = {
            PARENT: [exports.range30Bullet],
            COLOR: '${barrel.bulletColor}',
        };`;

        codes.push(bulletCode);
        constructedExportsLookup.set(bulletExportName, bulletCode);
    }

    // ==============================================================================
    // Rocket with custom color.
    // ==============================================================================
    const rocketExportName = `${tank.id}_rocket_${stripHash(barrel.bulletColor)}`;         

    if (!constructedExportsLookup.get(rocketExportName)){        
       
        const rocketCode = `exports.${rocketExportName} = {
            PARENT: [exports.rocket],
            COLOR: '${barrel.bulletColor}',            
            GUNS: 
            [                
                {
                    POSITION: [    8,     11,     1.4,     8,      0,      180,      0,   ], 
                    GUN_COLOR: '${barrel.color}',
                    PROPERTIES: {
                        AUTOFIRE: false,
                        STAT_CALCULATOR: gunCalcNames.thruster,
                        SHOOT_SETTINGS: combineStats([g.basic, g.mach, g.muchmorerecoil, g.morerecoil,]),
                        TYPE: [exports.${bulletExportName}, {
                            PERSISTS_AFTER_DEATH: true,
                        }],            
                    }
                }
            ]
        };`;

        codes.push(rocketCode);
        constructedExportsLookup.set(rocketExportName, rocketCode);
    }
   
    return codes.join(';');
}


async function constructRocketBarrelContainer (barrel, tank) {    
    // LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY            
    const code = `{
            POSITION: [10, 12, -0.5, 9, ${barrel.yoffset}, ${barrel.angle}, 0, ],
            GUN_COLOR: '${barrel.color}',
        }, 
        {
            POSITION: [15.5, 15, 0.7, 0, ${barrel.yoffset}, ${barrel.angle}, 0, ],
            GUN_COLOR: '${barrel.color}',
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter, g.sidewind, g.pound, g.destroy, g.doublereload, g.almostNoRecoil], ${getBarrelStats(barrel)}),
                TYPE: exports.${tank.id}_rocket_${stripHash(barrel.bulletColor)},
                STAT_CALCULATOR: gunCalcNames.sustained,
            },
        }`;
    
    return code;    
}


async function constructSidewinderBarrel (barrel, tank) {        
    const codes = [];

    // ==============================================================================
    // Sidewinder (Snake) bullet with custom color.
    // ==============================================================================
    const bulletExportName = `${tank.id}_snake_bullet_${stripHash(barrel.bulletColor)}`;

    if (!constructedExportsLookup.get(bulletExportName)){        
        const bulletCode = `exports.${bulletExportName} = {
            PARENT: [exports.range30Bullet],
            COLOR: '${barrel.bulletColor}',
        };`;

        codes.push(bulletCode);
        constructedExportsLookup.set(bulletExportName, bulletCode);
    }

    // ==============================================================================
    // Sidewinder (Snake) with custom color.
    // ==============================================================================
    const barrelExportName = `${tank.id}_snake_${stripHash(barrel.bulletColor)}`;         

    if (!constructedExportsLookup.get(barrelExportName)){        
       
        const barrelCode = `exports.${barrelExportName} = {
            PARENT: [exports.snake],
            COLOR: '${barrel.bulletColor}',
            GUNS: [{
                POSITION: [6, 12, 1.4, 8, 0, 180, 0, ],
                GUN_COLOR: '${barrel.color}',
                PROPERTIES: {
                    AUTOFIRE: false,
                    STAT_CALCULATOR: gunCalcNames.thruster,
                    SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter, g.hunter2, g.snake, g.snakeskin,]),
                    TYPE: [exports.${bulletExportName}, {
                        PERSISTS_AFTER_DEATH: true,
                    }],
                },
            }, {
                POSITION: [10, 12, 0.8, 8, 0, 180, 0.5, ],
                GUN_COLOR: '${barrel.color}',
                PROPERTIES: {
                    AUTOFIRE: false,
                    NEGATIVE_RECOIL: true,
                    STAT_CALCULATOR: gunCalcNames.thruster,
                    SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter, g.hunter2, g.snake,]),
                    TYPE: [exports.${bulletExportName}, {
                        PERSISTS_AFTER_DEATH: true,
                    }],
                },
            }, ],
        };`;

        codes.push(barrelCode);
        constructedExportsLookup.set(barrelExportName, barrelCode);
    }
   
    return codes.join(';');
}

async function constructSidewinderBarrelContainer (barrel, tank) {    
    // LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY            
    const code = `{
            POSITION: [10, 11, -0.5, 14, ${barrel.yoffset}, ${barrel.angle}, 0, ],
            GUN_COLOR: '${barrel.color}',
        }, {
            POSITION: [21, 12, -1.1, 0, ${barrel.yoffset}, ${barrel.angle}, 0, ],
            GUN_COLOR: '${barrel.color}',
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter, g.sidewind, g.tadmorereload, ${getBarrelStats(barrel)}]),
                TYPE: exports.${tank.id}_snake_${stripHash(barrel.bulletColor)},
                STAT_CALCULATOR: gunCalcNames.sustained,
            },
        }`;
    
    return code;    
}


async function constructReverseMissileBarrel (barrel, tank) {        
    const codes = [];

    // ==============================================================================
    // Reverse Missile bullet with custom color.
    // ==============================================================================
    const bulletExportName = `${tank.id}_reverse_missile_bullet_${stripHash(barrel.bulletColor)}`;

    if (!constructedExportsLookup.get(bulletExportName)){        
        const bulletCode = `exports.${bulletExportName} = {
            PARENT: [exports.extremelyShortLivedBullet],
            COLOR: '${barrel.bulletColor}',
        };`;

        codes.push(bulletCode);
        constructedExportsLookup.set(bulletExportName, bulletCode);
    }

    // ==============================================================================
    // Reverse Missile with custom color.
    // ==============================================================================
    const barrelExportName = `${tank.id}_reverse_missile_${stripHash(barrel.bulletColor)}`;         

    if (!constructedExportsLookup.get(barrelExportName)){        
       
        const barrelCode = `exports.${barrelExportName} = {
            PARENT: [exports.reverseMissile],
            COLOR: '${barrel.bulletColor}',
            GUNS: [{
                POSITION: [14, 6, 1, 0, -2, 30, 0, ],
                GUN_COLOR: '${barrel.color}',
                PROPERTIES: {
                    AUTOFIRE: false,            
                    SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.almostNoRecoil, g.morespeed, g.doublereload]),        
                    TYPE: [exports.${bulletExportName}, {
                        PERSISTS_AFTER_DEATH: true,                
                    }],
                    STAT_CALCULATOR: gunCalcNames.thruster,
                },
            }, {
                POSITION: [14, 6, 1, 0, 2, 330, 0, ],
                GUN_COLOR: '${barrel.color}',
                PROPERTIES: {
                    AUTOFIRE: false,            
                    SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.almostNoRecoil, g.morespeed, g.doublereload]),        
                    TYPE: [exports.${bulletExportName}, {
                        PERSISTS_AFTER_DEATH: true,                
                    }],
                    STAT_CALCULATOR: gunCalcNames.thruster,
                },
            }, ],
        };`;

        codes.push(barrelCode);
        constructedExportsLookup.set(barrelExportName, barrelCode);
    }
   
    return codes.join(';');
}

async function constructReverseMissileBarrelContainer (barrel, tank) {    
    // LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY
    const code = `{
        POSITION: [10, 14, -0.5, 9, ${barrel.yoffset}, ${barrel.angle}, 0, ],
        GUN_COLOR: '${barrel.color}',
    }, {
        POSITION: [17, 15, 1, 0, ${barrel.yoffset}, ${barrel.angle}, 0, ],
        GUN_COLOR: '${barrel.color}',
        PROPERTIES: {            
            SHOOT_SETTINGS: combineStats([g.basic, g.pound, g.destroy, ${getBarrelStats(barrel)}]),
            TYPE: exports.${tank.id}_reverse_missile_${stripHash(barrel.bulletColor)},
            STAT_CALCULATOR: gunCalcNames.sustained,
        },
    }`;

    return code;
}


module.exports = {
    parse,
    validate,
    convert
}