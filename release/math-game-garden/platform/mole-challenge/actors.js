import {MoleAnimation} from '../mole-demo/animation.js';
// Keep WP06-A timing/art intact. Only the answer actors wait indefinitely.
export class AnswerMole extends MoleAnimation{
 startAt(hole){super.start();this.hole=hole;}
 startle(){if(!['emerge','wait'].includes(this.phase))return false;this.phase='startled';this.time=0;return true;}
 withdraw(){if(this.visible()>0){this.phase='retreat';this.time=0;}}
 pose(){return this.phase==='startled'?'surprise':super.pose();}
 tick(dt){if(!this.running)return;if(this.phase==='wait'){this.time=(this.time+Math.min(.08,dt))%4.5;return;}if(this.phase==='startled'){this.time+=Math.min(.08,dt);if(this.time>=.55){this.phase='wait';this.time=0;}return;}if(this.phase==='cooldown'){this.phase='ready';this.running=false;this.time=0;return;}super.tick(dt);}
}
