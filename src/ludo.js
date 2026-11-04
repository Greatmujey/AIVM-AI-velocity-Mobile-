// Two-token-per-side Ludo-inspired game: one loop, private home lanes, six
// to leave the yard, safe squares, capture, exact finish, and extra six rolls.
export const SAFE_SQUARES = [0,8,13,21,26,34,39,47];
export const TRACK_LENGTH=52, FINISH=57;
export function createLudo(){return {turn:0,tokens:[[-1,-1],[-1,-1]],die:null,winner:null,last:''}}
export function square(player,progress){return progress<0||progress>=TRACK_LENGTH?null:(progress+(player===0?0:26))%TRACK_LENGTH}
export function legalLudoMoves(state){if(state.die===null||state.winner!==null)return [];return state.tokens[state.turn].map((p,i)=>p===-1?(state.die===6?i:-1):(p<FINISH&&p+state.die<=FINISH?i:-1)).filter(i=>i>=0)}
export function rollLudo(state,random=Math.random){if(state.die!==null||state.winner!==null)return false;state.die=Math.floor(random()*6)+1;state.last=`${state.turn?'Computer':'You'} rolled ${state.die}`;if(!legalLudoMoves(state).length){state.last+=' · no moves';state.die=null;state.turn=1-state.turn}return true}
export function moveLudo(state,index){const moves=legalLudoMoves(state);if(!moves.includes(index))return false;const who=state.turn,die=state.die,previous=state.tokens[who][index],next=previous===-1?0:previous+die;state.tokens[who][index]=next;const s=square(who,next);if(s!==null&&!SAFE_SQUARES.includes(s)){for(let i=0;i<2;i++)if(square(1-who,state.tokens[1-who][i])===s){state.tokens[1-who][i]=-1;state.last+=' · captured!'}}if(state.tokens[who].every(p=>p===FINISH)){state.winner=who;state.last=who?'Computer wins!':'You win!'}state.die=null;if(state.winner===null&&die!==6)state.turn=1-who;return true}
