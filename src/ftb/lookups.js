const constants = require('./constants');

const barrelNameLookup = new Map();
barrelNameLookup.set(0, 'Gun barrel');
barrelNameLookup.set(1, 'Trap barrel');
barrelNameLookup.set(2, 'Drone barrel');
barrelNameLookup.set(3, 'Necro drone barrel');
barrelNameLookup.set(4, 'Auto turret (below body)');
barrelNameLookup.set(50, 'Auto turret (above body)');
barrelNameLookup.set(100, 'Minion barrel');
barrelNameLookup.set(150, 'Swarm barrel');
barrelNameLookup.set(200, 'BigAuto4Gun turret (below body)');
barrelNameLookup.set(250, 'Missile barrel');
barrelNameLookup.set(300, 'Pillbox barrel');
barrelNameLookup.set(350, 'Rotating Missile barrel');
barrelNameLookup.set(400, 'Pentagon barrel');
barrelNameLookup.set(450, 'Square Minion barrel');
barrelNameLookup.set(500, 'Auto Twin turret (center body)');
barrelNameLookup.set(550, 'Sniper turret (center body)');
barrelNameLookup.set(600, 'Predator barrel');
barrelNameLookup.set(650, 'BigAuto4Gun turret (center body)');
barrelNameLookup.set(700, 'Boomerange barrel');
barrelNameLookup.set(750, 'Block barrel');
barrelNameLookup.set(800, 'Rocket barrel');
barrelNameLookup.set(850, 'Sidewinder barrel');
barrelNameLookup.set(900, 'Reverse Missile barrel');


const maxBarrelPerTypeLookup = new Map();
maxBarrelPerTypeLookup.set(0, constants.MaxBarrels);
maxBarrelPerTypeLookup.set(1, constants.MaxBarrels);
maxBarrelPerTypeLookup.set(2, constants.MaxBarrels);
maxBarrelPerTypeLookup.set(3, constants.MaxBarrels);
maxBarrelPerTypeLookup.set(4, constants.MaxBarrels);
maxBarrelPerTypeLookup.set(50, constants.MaxBarrels);
maxBarrelPerTypeLookup.set(100, constants.MaxBarrels);
maxBarrelPerTypeLookup.set(150, constants.MaxBarrels);
maxBarrelPerTypeLookup.set(200, 8);
maxBarrelPerTypeLookup.set(250, constants.MaxBarrels);
maxBarrelPerTypeLookup.set(300, constants.MaxBarrels);
maxBarrelPerTypeLookup.set(350, constants.MaxBarrels);
maxBarrelPerTypeLookup.set(400, constants.MaxBarrels);
maxBarrelPerTypeLookup.set(450, constants.MaxBarrels);
maxBarrelPerTypeLookup.set(500, 1);
maxBarrelPerTypeLookup.set(550, 1);
maxBarrelPerTypeLookup.set(600, 8);
maxBarrelPerTypeLookup.set(650, 1);
maxBarrelPerTypeLookup.set(700, 8);
maxBarrelPerTypeLookup.set(750, 8);
maxBarrelPerTypeLookup.set(800, 6);
maxBarrelPerTypeLookup.set(850, 6);
maxBarrelPerTypeLookup.set(900, 4);

const maxChildrenLookup = new Map();
maxChildrenLookup.set(0, 4);
maxChildrenLookup.set(1, 6);
maxChildrenLookup.set(2, 2);
maxChildrenLookup.set(3, 2);
maxChildrenLookup.set(4, 4);
maxChildrenLookup.set(50, 4);
maxChildrenLookup.set(100, 1);
maxChildrenLookup.set(150, 3);
maxChildrenLookup.set(200, 4);
maxChildrenLookup.set(250, 1);
maxChildrenLookup.set(300, 2);
maxChildrenLookup.set(350, 1);
maxChildrenLookup.set(400, 1);
maxChildrenLookup.set(450, 1);
maxChildrenLookup.set(500, 8);
maxChildrenLookup.set(550, 4);
maxChildrenLookup.set(600, 8);
maxChildrenLookup.set(650, 6);
maxChildrenLookup.set(700, 3);
maxChildrenLookup.set(750, 6);
maxChildrenLookup.set(800, 4);
maxChildrenLookup.set(850, 4);
maxChildrenLookup.set(900, 6);


const bodyShapeValueLookup = new Map();

(function initBodyShapeValues(lookup){    
    lookup.set('circle', 0);
    lookup.set('smasher', 0);
    lookup.set('landmine', 0);
    lookup.set('spike', 0);
    lookup.set('dominator', 0);
    lookup.set('base', 0);
    lookup.set('drive', 0);
    lookup.set('triangle', 3);
    lookup.set('square', 4);
    lookup.set('pentagon', -5);    
})(bodyShapeValueLookup);

module.exports = {
  barrelNameLookup,
  maxBarrelPerTypeLookup,
  maxChildrenLookup,
  bodyShapeValueLookup
};