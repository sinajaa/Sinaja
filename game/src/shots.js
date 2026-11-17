// Deterministic scenes for the four screenshots: each one is the real game, posed.
function poseCars(game, cars) {
  let i = 0;
  for (const [x, z, heading] of cars) {
    const car = game.traffic[i++];
    if (!car) break;
    car.traffic = null;
    car.pos.set(x, 0, z);
    car.heading = heading;
    car.speed = 0;
    car.mesh.position.set(x, 0.02, z);
    car.mesh.rotation.y = heading;
  }
}

export function applyShot(game, name, seed) {
  if (!name) return;
  game.screenshotMode = true;
  game.hud.show();
  document.getElementById('overlay').classList.add('hidden');
  game.start();
  game.cameraYaw = 0;
  game.cameraPitch = 0.16;
  game.cameraHeight = 2.0;

  if (name === 'street') {
    game.teleport(0, 264.5, Math.PI);
    game.cameraYaw = 0;
    game.cameraPitch = 0.1;
    game.cameraHeight = 2.2;
    game.cameraDistance = 6.4;
    game.cine = { pos: [4, 5.6, 284], look: [0, 1.2, 242] };
    game.money = 1250;
    game.wanted.clear();
    poseCars(game, [
      [-26, 255.4, Math.PI / 2], [14, 262.6, -Math.PI / 2], [-48, 255.4, Math.PI / 2],
      [38, 262.6, -Math.PI / 2], [62, 255.4, Math.PI / 2], [-74, 262.6, -Math.PI / 2],
    ]);
    game.missions.index = 0;
    game.missions.startNext(game);
  } else if (name === 'car') {
    game.spawnPlayerCar(37, 54, 0, 'sports', 0xd94a4a);
    game.playerCar.speed = 17;
    game.cameraYaw = Math.PI * 1.5;
    game.cameraPitch = 0.14;
    game.cameraHeight = 4.0;
    game.cameraDistance = 10.5;
    game.cine = { pos: [30, 5.5, 34], look: [42, 1.2, 64] };
    game.money = 2480;
    poseCars(game, [
      [33.4, 78, 0], [40.6, 88, Math.PI], [33.4, 106, 0], [40.6, 118, Math.PI],
      [33.4, 134, 0], [40.6, 66, Math.PI],
    ]);
    game.missions.index = 1;
    game.missions.startNext(game);
  } else if (name === 'chase') {
    game.spawnPlayerCar(37, 128, 0, 'sports', 0xe8542f);
    game.playerCar.speed = 14;
    game.cameraYaw = 0;
    game.cameraPitch = 0.16;
    game.cameraHeight = 5.2;
    game.cameraDistance = 11.5;
    game.cine = { pos: [34, 6.5, 104], look: [38, 1, 152] };
    game.money = 3640;
    game.wanted.clear();
    game.wanted.add(3, 'scene');
    game.police.spawnCruiser(18, 148, Math.PI);
    game.police.spawnCruiser(56, 154, Math.PI);
    game.police.update(0.2, game.playerCar.pos, game.playerCar, game.colliders, () => {});
    game.police.spawnOfficer(22, 150);
    game.police.spawnOfficer(52, 156);
    poseCars(game, [
      [33.4, 112, 0], [40.6, 120, Math.PI], [30, 176, 0], [44, 190, Math.PI],
    ]);
    game.missions.index = 2;
    game.missions.startNext(game);
  } else if (name === 'mission') {
    game.teleport(64, -58, 2.4);
    game.cameraYaw = 2.4 + Math.PI;
    game.cameraPitch = 0.12;
    game.cameraHeight = 3.4;
    game.cameraDistance = 8.5;
    game.cine = { pos: [50, 5, -44], look: [76, 2, -78] };
    game.money = 1890;
    game.wanted.clear();
    game.wanted.add(1, 'scene');
    poseCars(game, [
      [60, -30, Math.PI], [52, -26, 0], [74, -20, Math.PI], [66, -14, 0],
    ]);
    game.missions.index = 2;
    game.missions.startNext(game);
  }
  game.save();
}
