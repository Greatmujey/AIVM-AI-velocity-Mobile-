import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { VEHICLE_CATALOG, vehicleById, catalogForKind, raceClassOf, vehiclesForSale, pickTrafficVehicle, pickTrafficBike, tintFor, applyCatalog, handlingFor, dealershipStock, DEALERSHIP_NAME } from '../src/vehicles.js';

test('the catalog is a real fleet: several marques, bikes and cars, unique ids',()=>{
  assert.ok(VEHICLE_CATALOG.length>=18,`expected a busy fleet, got ${VEHICLE_CATALOG.length}`);
  assert.equal(new Set(VEHICLE_CATALOG.map(v=>v.id)).size,VEHICLE_CATALOG.length);
  assert.ok(new Set(VEHICLE_CATALOG.map(v=>v.brand)).size>=10,'expected many marques');
  assert.ok(catalogForKind('bike').length>=4,'bikes need their own models');
  assert.ok(catalogForKind('car').length>=10);
  assert.ok(VEHICLE_CATALOG.some(v=>v.kind==='emergency')&&VEHICLE_CATALOG.some(v=>v.kind==='service'));
});

test('every catalog model has its own local asset file',()=>{
  for(const entry of VEHICLE_CATALOG){
    const path=`public/assets/models/${entry.variant}.glb`;
    assert.ok(existsSync(path),`${entry.id} is missing ${path}`);
  }
});

test('no real manufacturer or model name is used',()=>{
  const banned=['toyota','benz','mercedes','honda','ford','bmw','audi','nissan','hyundai','kia','ferrari','lamborghini','porsche','chevrolet','lexus','volkswagen','corolla','camry','civic','hilux','mustang','golf'];
  for(const entry of VEHICLE_CATALOG){
    const text=`${entry.brand} ${entry.model} ${entry.segment}`.toLowerCase();
    for(const word of banned)assert.ok(!text.includes(word),`${entry.id} uses the real name ${word}`);
  }
});

test('stats are sane and the catalog drives handling',()=>{
  for(const entry of VEHICLE_CATALOG){
    assert.ok(entry.top>=8&&entry.top<=26,`${entry.id} top speed ${entry.top}`);
    assert.ok(entry.steer>=1&&entry.steer<=2.6,`${entry.id} steer ${entry.steer}`);
    assert.ok(entry.length>=2&&entry.length<=7.5,`${entry.id} length ${entry.length}`);
    assert.ok(entry.price>=0);
    assert.ok(entry.tints.length>=1);
  }
  const supercar=vehicleById('halcyon-proto'),saloon=vehicleById('sable-240'),bike=vehicleById('orbit-600');
  assert.ok(supercar.top>saloon.top,'a supercar must outrun a family saloon');
  assert.ok(bike.top>saloon.top,'a superbike must outrun a family saloon');
  assert.ok(vehicleById('harvest-tractor').top<saloon.top);
});

test('handlingFor reads the catalog and respects the dealer upgrade',()=>{
  const car={type:'car',topSpeed:20,steerRate:1.7};
  assert.equal(handlingFor(car).top,20);
  assert.equal(handlingFor(car,{carUpgrade:true}).top,23);
  const bike={type:'bike',topSpeed:23,steerRate:1.9};
  assert.equal(handlingFor(bike,{carUpgrade:true}).top,23,'the car upgrade must not touch bikes');
  assert.deepEqual(handlingFor({type:'car'}),{top:16,steer:1.65});
  assert.deepEqual(handlingFor({type:'bike'}),{top:19,steer:1.65});
});

test('applyCatalog turns an entry into a drivable vehicle',()=>{
  const vehicle={type:'car',mesh:{}};
  applyCatalog(vehicle,vehicleById('haulmaster-900'),0xffffff);
  assert.equal(vehicle.type,'car');
  assert.equal(vehicle.variant,'truck');
  assert.equal(vehicle.length,6.2);
  assert.equal(vehicle.brand,'HAULMASTER');
  assert.equal(vehicle.topSpeed,16);
  const bike={type:'car',mesh:{}};
  applyCatalog(bike,vehicleById('kestrel-250'));
  assert.equal(bike.type,'bike');
  assert.equal(raceClassOf(bike),'bike');
  assert.equal(raceClassOf(vehicle),'car');
});

test('traffic picks are weighted, always valid and include bikes',()=>{
  const seen=new Set();
  for(let i=0;i<4000;i++){
    const entry=pickTrafficVehicle(()=>((i*7919)%1000)/1000);
    assert.ok(entry&&entry.traffic>0);
    seen.add(entry.id);
    const bike=pickTrafficBike(()=>((i*104729)%1000)/1000);
    assert.equal(bike.kind,'bike');
  }
  assert.ok(seen.size>=8,'traffic should show a spread of vehicles');
  assert.ok(!seen.has('palm-kart'),'karts are a purchase, not traffic');
  assert.ok(seen.has('sable-240')||seen.has('palm-cab'),'common cars must appear');
});

test('the dealership sells both disciplines at honest prices',()=>{
  assert.equal(DEALERSHIP_NAME,'HALCYON MOTORS');
  const cars=dealershipStock('car'),bikes=dealershipStock('bike');
  assert.ok(cars.length>=10&&bikes.length>=4);
  for(const entry of [...cars,...bikes]){
    assert.ok(entry.price>0,`${entry.id} must cost something`);
    assert.equal(entry.cls,raceClassOf(entry));
  }
  assert.ok(cars.every(entry=>entry.kind!=='bike'));
  assert.ok(bikes.every(entry=>entry.kind==='bike'));
  assert.equal(vehiclesForSale('bike').length,bikes.length);
  assert.ok(tintFor(vehicleById('sable-240'),()=>0.99)!==undefined);
});
