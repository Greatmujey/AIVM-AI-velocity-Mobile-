// Repeatable, solo jobs. All checkpoints are on the existing road grid.
export const ACTIVITIES = {
  coast:{title:'COASTAL COURIER',description:'Deliver supplies through the village.',reward:450,points:[{x:84,z:56},{x:112,z:84}]},
  port:{title:'PORT DISPATCH',description:'Deliver a package to South Port.',reward:550,points:[{x:-84,z:-56},{x:-112,z:-84}]},
  carRace:{title:'CITY CAR TIME TRIAL',description:'Drive a car through the checkpoints.',reward:700,vehicle:'car',seconds:180,points:[{x:0,z:0},{x:0,z:-56},{x:56,z:-56},{x:56,z:0}]},
  bikeRace:{title:'BIKE TIME TRIAL',description:'Ride a bike through the checkpoints.',reward:700,vehicle:'bike',seconds:180,points:[{x:0,z:0},{x:-56,z:0},{x:-56,z:56},{x:0,z:56}]},
};
export function advanceActivity(activity,position,vehicleType,dt) {
  if(activity.seconds){activity.remaining=Math.max(0,activity.remaining-dt);if(activity.remaining===0)return 'expired'}
  const point=activity.points[activity.step];
  if(point&&Math.hypot(position.x-point.x,position.z-point.z)<6&&(!activity.vehicle||activity.vehicle===vehicleType)){
    activity.step++;return activity.step===activity.points.length?'complete':'checkpoint';
  }
  return null;
}
export function startActivity(id){const definition=ACTIVITIES[id];if(!definition)return null;return {...definition,id,step:0,remaining:definition.seconds||0}}
