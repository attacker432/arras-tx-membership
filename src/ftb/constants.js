module.exports = Object.freeze({
  // ================================================================
  // 0		Gun barrel
  // 1		Trap barrel
  // 2		Drone barrel
  // 3		Necro drone barrel
  // 4		Auto turret (Heavy3Gun, under tank body)
  // ================================================================
  // Not in FTB.
  // 50       Auto turret (Heavy3Gun, above tank body)
  // 100      Minion barrel
  // 150      Swarm barrel
  // 200      BigAuto4Gun turret (under tank body)
  // 250      Missile barrel
  // 300      Pillbox barrel
  // 350      Rotating Missile barrel
  // 400      Pentagon barrel
  // 450      Square Minion barrel
  // 500      Auto Twin turret (center body, only one allowed)
  // 550      Sniper turret (center body, only one allowed)
  // 600      Predator barrel (right-click zoom enabled)
  // 650      BigAuto4Gun turret (center body, only one allowed)
  // 700      Boomerang barrel
  // 750      Block barrel
  // 800      Rocket barrel
  // 850      Sidewinder barrel
  // 900      Reverse Missile barrel
  // ================================================================
  ValidBarrelTypes: [
    0, 1, 2, 3, 4, 50, 100, 150, 200, 
    250, 300, 350, 400, 450, 500, 550, 
    600, 650, 700, 750, 800, 850, 900
  ],

  GunBarrelTypes: [
    0, 1, 2, 3, 100, 150, 250, 300, 350, 
    400, 450, 600, 700, 750, 800, 850, 900
  ],

  TurretBarrelTypes: [4, 50, 200, 500, 550, 650],

  MutuallyExclusiveBarrelTypes: [
    500,    // Auto Twin turret
    550,    // Sniper turret
    650,    // BigAuto4 gun turret
  ],

  NonGunBarrelTypes: [1, 2, 3, 4, 50, 100, 150, 200, 500, 550, 650],

  ZoomAbilityGunBarrelType: 600,

  ValidBodyShapes: [
    'circle', 
    'triangle', 
    'square', 
    'pentagon', 
    'smasher', 
    'landmine',
    'spike', 
    'dominator', 
    'base', 
    'drive',
    'teleporter',
    'telekinetic',
    'freezegun',
    'teleportgun',
    'lightning',
    'earthshaker',
    'witchcraft',
    'imprisoner',
    'shapeshifter',
    'warg',
    'stupefier'
  ],

  RamBodyShapes: ['smasher', 'landmine', 'spike', 'dominator', 'base'],

  MaxBarrels: 14,
  MinAngle: 0,
  MaxAngle: 359.99,
  MinBarrelOffset: -100,
  MaxBarrelOffset: 100,

  MinDelay: 0,
  MaxDelay: 5,
  MinKnockback: 0,
  MaxKnockback: 1.1,
  MinSpread: 0,
  MaxSpread: 30,

  MinBodySize: 25,
  MaxBodySize: 60,
  MinBarrelSize: 2,
  MaxBarrelSize: 90,
  MinDamage: 6,
  MaxDamage: 6,
  MinReload: 75,
  MaxReload: 75,
  FTBToArrasBodyRatio: 2.7,
});