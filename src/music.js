// Two small original synth loops, generated locally; no external music files.
const tracks={coast:{bpm:100,notes:[220,277,330,277, 196,247,294,247, 174.6,220,261.6,220, 196,247,294,247]},night:{bpm:86,notes:[164.8,196,246.9,196, 146.8,174.6,220,174.6, 130.8,164.8,196,164.8, 146.8,174.6,220,174.6]}};
export function createMusic(audio){
  let next=0,step=0;
  return { update(track,volume,muted){
    const score=tracks[track];if(!score||muted||volume<=0||audio.state!=='running'){next=0;return}
    const now=audio.currentTime;if(next<now)next=now+.05;
    while(next<now+.18){const osc=audio.createOscillator(),gain=audio.createGain(),duration=60/score.bpm/2;
      osc.type=track==='coast'?'triangle':'sine';osc.frequency.value=score.notes[step%score.notes.length];
      gain.gain.setValueAtTime(.0001,next);gain.gain.exponentialRampToValueAtTime(.035*volume,next+.035);gain.gain.exponentialRampToValueAtTime(.0001,next+duration*.9);
      osc.connect(gain);gain.connect(audio.destination);osc.start(next);osc.stop(next+duration);next+=duration;step++;
    }
  }};
}
