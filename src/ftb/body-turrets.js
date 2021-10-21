module.exports = Object.freeze({
  smasher:`{
      POSITION: [21.5, 0, 0, 0, 360, 0, ],
      TYPE: exports.smasherBody,
  }`,
  
  landmine:`{
      POSITION: [21.5, 0, 0, 0, 360, 0, ],
      TYPE: exports.landMineBody,
  }, {
      POSITION: [21.5, 0, 0, 36, 360, 0, ],
      TYPE: exports.landMineBody,
  }`,
  
  spike:`{
      POSITION: [20.5, 0, 0, 0, 360, 0, ],
      TYPE: exports.spikeBody,
  }, {
      POSITION: [20.5, 0, 0, 120, 360, 0, ],
      TYPE: exports.spikeBody,
  }, {
      POSITION: [20.5, 0, 0, 240, 360, 0, ],
      TYPE: exports.spikeBody,
  }`,
  
  dominator:`{
      POSITION: [22.5, 0, 0, 0, 360, 0, ],
      TYPE: exports.megasmashBody,
  }`,
  
  base:`{
      POSITION: [25, 0, 0, 0, 360, 0, ],
      TYPE: exports.dominationBody,
  }`,
  
  drive:`{
      POSITION: [11, 0, 0, 0, 360, 1, ],
      TYPE: [exports.overdriveTurret, {
          INDEPENDENT: true,            
      }]
  }`,
  
  teleporter:`{
      POSITION: [8, 0, 0, 0, 360, 1, ],
      TYPE: [exports.teleporterCenterTurret, {
          INDEPENDENT: true,
      }]
  }`,
  
  telekinetic:`{
      POSITION: [8, 0, 0, 0, 360, 1, ],
      TYPE: [exports.telekineticCenterTurret, {
          INDEPENDENT: true,
      }]
  }`,

  freezegun:`{
      POSITION: [10, 0, 0, 0, 360, 1, ],
      TYPE: [exports.freezeGunCenterTurret, {
          INDEPENDENT: true,
      }]
  }`,

  teleportgun:`{
      POSITION: [13, 0, 0, 0, 360, 1, ],
      TYPE: [exports.phantomZoneOuterTurret, {
          INDEPENDENT: true,
      }]
  }, {
      POSITION: [7, 0, 0, 0, 360, 1, ],
      TYPE: [exports.phantomZoneInnerTurret, {
          INDEPENDENT: true,
      }]
  }`,

  lightning:`{
      POSITION: [10, 0, 0, 0, 360, 1, ],
      TYPE: [exports.lightningCenterTurret, {
          INDEPENDENT: true,
      }]
  }`,

  earthshaker:`{
      POSITION: [10, 0, 0, 0, 360, 1, ],
      TYPE: [exports.earthShakerCenterTurret, {
          INDEPENDENT: true,
      }]
  }`,

  witchcraft:`{
      POSITION: [14, 0, 0, 0, 360, 1, ],
      TYPE: [exports.witchcraftOuterTurret, {
          INDEPENDENT: true,
      }]
  }, {
      POSITION: [8, 0, 0, 0, 360, 1, ],
      TYPE: [exports.witchcraftInnerTurret, {
          INDEPENDENT: true,
      }]
  }`,

  imprisoner:`{
      POSITION: [12, 0, 0, 0, 360, 1, ],
      TYPE: [exports.imprisonerOuterTurret, {
          INDEPENDENT: true,
      }]
  }, {
      POSITION: [5, 0, 0, 0, 360, 1, ],
      TYPE: [exports.imprisonerInnerTurret, {
          INDEPENDENT: true,
      }]
  }`,

  shapeshifter:`{
      POSITION: [12, 0, 0, 0, 360, 1, ],
      TYPE: [exports.shapeshifterOuterTurret, {
          INDEPENDENT: true,
      }]
  }, {
      POSITION: [5, 0, 0, 0, 360, 1, ],
      TYPE: [exports.shapeshifterInnerTurret, {
          INDEPENDENT: true,
      }]
  }`,

  warg:`{
      POSITION: [11, 0, 0, 0, 360, 1, ],
      TYPE: [exports.wargOuterTurret, {
          INDEPENDENT: true,
      }]
  }, {
      POSITION: [5, 0, 0, 0, 360, 1, ],
      TYPE: [exports.wargInnerTurret, {
          INDEPENDENT: true,
      }]
  }`,

  stupefier:`{
      POSITION: [12, 0, 0, 0, 360, 1, ],
      TYPE: [exports.stupefierOuterTurret, {
          INDEPENDENT: true,
      }]
  }, {
      POSITION: [5, 0, 0, 0, 90, 1, ],
      TYPE: [exports.stupefierInnerTurret, {
          INDEPENDENT: true,
      }]
  }`    
});