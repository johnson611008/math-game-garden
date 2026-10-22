// Shot-based pressure, not a real-time countdown. One full row = six base shots.
export const BASE_UNITS=10000,ROW_UNITS=6*BASE_UNITS,WINDOW=5,MAX_RATE=2;
export function rateUnits(completed){return Math.min(MAX_RATE*BASE_UNITS,Math.round(BASE_UNITS*1.15**Math.min(5,Math.floor(completed/WINDOW))));}
export function advancePressure(completed,units){const total=units+rateUnits(completed);return {completed:completed+1,units:total%ROW_UNITS,rows:Math.floor(total/ROW_UNITS)};}
export function pressureInfo(completed,units){let future={completed,units,rows:0},remaining=0;while(!future.rows&&remaining<6){future=advancePressure(future.completed,future.units);remaining++;}return {completed,remaining,rate:rateUnits(completed)/BASE_UNITS};}
