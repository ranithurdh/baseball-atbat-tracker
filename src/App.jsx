import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus,
  Minus,
  X,
  Trash2,
  Check,
  Users,
  Target,
  Clock,
  Database,
  Loader2,
  ClipboardList,
  Printer,
} from 'lucide-react';

/* ============================================================
   CONFIG
   ============================================================ */
const HIT_TYPES = [
  'Grounder',
  'Fly Ball',
  'Line Drive',
  'Pop Up',
  'Strikeout',
  'Walk',
];
const OUTCOMES = ['Hit', 'Error', 'Out'];
const PITCHER_HANDS = ['Right', 'Left'];
const HAND_LETTER = { Right: 'R', Left: 'L' };

const COLORS = {
  grass: '#2F6B3C',
  grassDeep: '#234F2C',
  grassLight: '#3D8449',
  clay: '#B8823D',
  chalk: '#FCFAF4',
  paper: '#F1ECDF',
  ink: '#2A2520',
  inkFaint: '#8A8072',
  border: '#E3D8C3',
  hit: '#3D8449',
  error: '#C4881F',
  out: '#A8402F',
  walk: '#3D6E8C',
};
const OUTCOME_COLORS = {
  Hit: COLORS.hit,
  Error: COLORS.error,
  Out: COLORS.out,
  'Base on Balls': COLORS.walk,
};

// --- Summary page mini spray-chart appearance ---
const SUMMARY_FIELD_OPACITY = 0.25; // field diagram opacity, 0–1 (lower = lighter/fainter)
const SUMMARY_PIN_RADIUS = 11; // hit-location dot radius in SVG units (elsewhere it's 6.5)
const SUMMARY_PIN_FONT_SIZE = 13; // at-bat number printed inside the dot (elsewhere it's 7.5)

// Summary table column widths (%). The 3 spray-chart columns (Season 1/2,
// Tournament) split the remainder evenly, so keep ATBATINFO + NOTES + 60 = 100
// if you want the table to fill the page edge-to-edge without gaps.
const SUMMARY_ATBATINFO_COL_WIDTH = 26; // Player / at-bat-list column
const SUMMARY_NOTES_COL_WIDTH = 14; // Notes column

const STORAGE_KEYS = { TEAMS: 'teams', ATBATS: 'atbats' };

/* ============================================================
   STORAGE
   ============================================================ */
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function loadJSON(key, fallback) {
  try {
    const res = await fetch(`${API_BASE_URL}/data/${key}`);
    if (res.status === 404) return fallback; // nothing saved yet
    if (!res.ok) throw new Error(`Server responded ${res.status}`);
    const json = await res.json();
    return json.value ?? fallback;
  } catch (e) {
    console.error('Load failed', key, e);
    return fallback;
  }
}

async function saveJSON(key, value) {
  try {
    const res = await fetch(`${API_BASE_URL}/data/${key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    });
    return res.ok;
  } catch (e) {
    console.error('Storage save failed', key, e);
    return false;
  }
}

/* ============================================================
   FIELD SVG
   ============================================================ */
const FIELD_SVG_MARKUP = `
<?xml version="1.0" encoding="utf-8"?>
<svg viewBox="563.1430053710938 271.22198486328125 291.8790283203125 219.56402587890625" width="291.8790283203125" height="219.56402587890625" xmlns="http://www.w3.org/2000/svg"><g transform="matrix(1, 0, 0, 1, 0, 0)">
	<g>
		<g>
			<path fill="#FFFFFF" d="M709.084,486.395c-9.686,0-17.565-7.88-17.565-17.565c0-3.189,0.845-6.251,2.429-8.926L569.354,335.31&#10;&#9;&#9;&#9;&#9;l3.105-3.105c36.494-36.494,85.014-56.592,136.625-56.592c51.609,0,100.131,20.098,136.624,56.592l3.105,3.105L724.22,459.903&#10;&#9;&#9;&#9;&#9;c1.584,2.675,2.429,5.737,2.429,8.926C726.648,478.515,718.769,486.395,709.084,486.395z"/>
			<path fill="#009444" d="M709.084,280.004c52.143,0,99.349,21.135,133.52,55.306l-83.217,83.217l-40.987,40.987&#10;&#9;&#9;&#9;&#9;c2.384,2.384,3.858,5.678,3.858,9.315c0,7.276-5.898,13.174-13.174,13.174c-7.276,0-13.174-5.897-13.174-13.174&#10;&#9;&#9;&#9;&#9;c0-3.637,1.475-6.931,3.859-9.315l-40.988-40.987l-83.217-83.217C609.734,301.139,656.941,280.004,709.084,280.004&#10;&#9;&#9;&#9;&#9; M709.084,271.222c-26.673,0-52.553,5.226-76.921,15.533c-23.532,9.953-44.664,24.2-62.81,42.345l-6.21,6.21l6.21,6.21&#10;&#9;&#9;&#9;&#9;l83.217,83.217l36.064,36.064c-0.99,2.523-1.508,5.237-1.508,8.028c0,12.107,9.85,21.957,21.957,21.957&#10;&#9;&#9;&#9;&#9;c12.106,0,21.956-9.85,21.956-21.957c0-2.791-0.518-5.504-1.508-8.028l36.064-36.064l83.217-83.217l6.21-6.21l-6.21-6.21&#10;&#9;&#9;&#9;&#9;c-18.146-18.145-39.277-32.392-62.81-42.345C761.637,276.448,735.757,271.222,709.084,271.222L709.084,271.222z"/>
		</g>
		<g>
			<g>
				<g>
					<g>
						<path d="M 700.4229736328125 379.3689880371094 L 700.4229736328125 483.47198486328125 L 716.4140014648438 483.47198486328125 L 716.4140014648438 378.03900146484375 L 709.083984375 370.7080078125 Z" fill="#009444"/>
						<path fill="#46BC51" d="M745.824,281.772v125.677l13.42,13.42V284.891C754.82,283.692,750.345,282.65,745.824,281.772z"/>
						<path fill="#46BC51" d="M598.771,313.373v47.628l13.42,13.42v-69.785C607.61,307.351,603.133,310.264,598.771,313.373z"/>
						<path fill="#46BC51" d="M804.646,303.86v71.892l13.42-13.42V312.43C813.702,309.376,809.224,306.522,804.646,303.86z"/>
						<path fill="#46BC51" d="M628.182,296.167v94.245l13.42,13.42V290.498C637.058,292.215,632.58,294.103,628.182,296.167z"/>
						<path fill="#46BC51" d="M845.087,335.31l-1.241-1.242c-3.172-3.171-6.439-6.21-9.789-9.128v21.401L845.087,335.31z"/>
						<path fill="#46BC51" d="M574.322,334.068l-1.242,1.242l9.7,9.701v-18.893C579.897,328.677,577.071,331.319,574.322,334.068z"/>
						<path fill="#46BC51" d="M775.235,290.003v115.159l13.42-13.42v-96.185C784.254,293.534,779.778,291.681,775.235,290.003z"/>
						<path fill="#46BC51" d="M657.592,285.252v134.571l1.189,1.188l12.231-12.231V282.035&#10;&#9;&#9;&#9;&#9;&#9;&#9;&#9;C666.491,282.946,662.016,284.019,657.592,285.252z"/>
						<path fill="#46BC51" d="M716.414,278.399v99.639l13.42,13.42V279.371C725.392,278.893,720.917,278.569,716.414,278.399z"/>
						<path fill="#46BC51" d="M687.003,279.518v113.271l13.42-13.42V278.448C695.919,278.648,691.444,279.008,687.003,279.518z"/>
						<path fill="#009444" d="M709.084,278.248c-2.898,0-5.784,0.072-8.661,0.2v100.921l8.661-8.661l7.33,7.33v-99.639&#10;&#9;&#9;&#9;&#9;&#9;&#9;&#9;C713.978,278.308,711.535,278.248,709.084,278.248z"/>
						<path fill="#009444" d="M671.012,282.035V408.78l15.991-15.991V279.518C681.619,280.135,676.284,280.971,671.012,282.035z"/>
						<path fill="#009444" d="M641.602,290.498v113.334l15.991,15.991V285.252C652.179,286.762,646.846,288.516,641.602,290.498z"/>
						<path fill="#009444" d="M612.191,304.636v69.785l15.991,15.991v-94.245C622.727,298.727,617.393,301.555,612.191,304.636z"/>
						<path fill="#009444" d="M582.78,326.118v18.893l15.991,15.991v-47.628C593.248,317.31,587.912,321.564,582.78,326.118z"/>
						<path fill="#009444" d="M834.057,324.94c-5.136-4.474-10.473-8.647-15.991-12.51v49.901l15.991-15.99V324.94z"/>
						<path fill="#009444" d="M788.655,295.558v96.185l15.99-15.991V303.86C799.441,300.834,794.106,298.065,788.655,295.558z"/>
						<path fill="#009444" d="M759.244,284.891V420.87l0.142,0.142l15.85-15.849V290.003&#10;&#9;&#9;&#9;&#9;&#9;&#9;&#9;C769.989,288.066,764.656,286.357,759.244,284.891z"/>
						<path fill="#009444" d="M729.834,279.371v112.087l15.99,15.991V281.772C740.552,280.748,735.217,279.95,729.834,279.371z"/>
					</g>
					<path fill="#1C1C1C" d="M709.084,280.004c52.143,0,99.349,21.135,133.52,55.306l-83.217,83.217l-50.303-50.303l-50.303,50.303&#10;&#9;&#9;&#9;&#9;&#9;&#9;l-83.217-83.217C609.735,301.139,656.941,280.004,709.084,280.004 M709.084,276.491c-25.964,0-51.153,5.086-74.868,15.116&#10;&#9;&#9;&#9;&#9;&#9;&#9;c-22.904,9.688-43.473,23.556-61.136,41.218l-2.484,2.484l2.484,2.484l83.217,83.217l2.484,2.484l2.484-2.484l47.819-47.818&#10;&#9;&#9;&#9;&#9;&#9;&#9;l47.818,47.818l2.484,2.484l2.483-2.484l83.217-83.217l2.484-2.484l-2.484-2.484c-17.662-17.663-38.231-31.531-61.136-41.218&#10;&#9;&#9;&#9;&#9;&#9;&#9;C760.236,281.577,735.048,276.491,709.084,276.491L709.084,276.491z"/>
				</g>
				<g>
					
						<path d="M 671.757019 381.200989 H 746.409019 V 455.852989 H 671.757019 V 381.200989 Z" transform="matrix(-0.7071 0.7071 -0.7071 -0.7071 1506.4244 213.0723)" fill="#D3A267"/>
					<path fill="#1C1C1C" d="M709.084,368.224l50.303,50.303l-50.303,50.302l-50.303-50.302L709.084,368.224 M709.084,363.256&#10;&#9;&#9;&#9;&#9;&#9;&#9;l-2.484,2.484l-50.303,50.303l-2.484,2.484l2.484,2.484l50.303,50.303l2.484,2.484l2.483-2.484l50.303-50.303l2.484-2.484&#10;&#9;&#9;&#9;&#9;&#9;&#9;l-2.484-2.484l-50.303-50.303L709.084,363.256L709.084,363.256z"/>
				</g>
			</g>
			<g>
				<path fill="#46BC51" d="M709.084,483.76c-8.233,0-14.931-6.697-14.931-14.931c0-8.232,6.697-14.93,14.931-14.93&#10;&#9;&#9;&#9;&#9;&#9;c8.232,0,14.93,6.697,14.93,14.93C724.014,477.062,717.316,483.76,709.084,483.76z"/>
				<path fill="#1C1C1C" d="M709.084,455.656c7.275,0,13.174,5.898,13.174,13.173c0,7.276-5.898,13.174-13.174,13.174&#10;&#9;&#9;&#9;&#9;&#9;c-7.276,0-13.174-5.897-13.174-13.174C695.91,461.554,701.808,455.656,709.084,455.656 M709.084,452.143&#10;&#9;&#9;&#9;&#9;&#9;c-9.202,0-16.688,7.486-16.688,16.687c0,9.201,7.486,16.688,16.688,16.688c9.201,0,16.687-7.486,16.687-16.688&#10;&#9;&#9;&#9;&#9;&#9;C725.771,459.628,718.285,452.143,709.084,452.143L709.084,452.143z"/>
			</g>
			<g>
				
					<path d="M 704.15802 367.779999 H 714.01102 V 377.632998 H 704.15802 V 367.779999 Z" transform="matrix(-0.7071 0.7071 -0.7071 -0.7071 1474.0254 134.8518)" fill="#FFFFFF"/>
				<path fill="#1C1C1C" d="M709.084,368.224l4.482,4.482l-4.482,4.482l-4.482-4.482L709.084,368.224 M709.084,363.256l-2.484,2.484&#10;&#9;&#9;&#9;&#9;&#9;l-4.482,4.482l-2.484,2.484l2.484,2.484l4.482,4.482l2.484,2.484l2.483-2.484l4.482-4.482l2.484-2.484l-2.484-2.484&#10;&#9;&#9;&#9;&#9;&#9;l-4.482-4.482L709.084,363.256L709.084,363.256z"/>
			</g>
			<g>
				
					<path d="M 749.978027 413.601013 H 759.830028 V 423.453013 H 749.978027 V 413.601013 Z" transform="matrix(-0.7071 0.7071 -0.7071 -0.7071 1584.6538 180.7012)" fill="#FFFFFF"/>
				<path fill="#1C1C1C" d="M754.904,414.044l4.482,4.482l-4.482,4.482l-4.483-4.482L754.904,414.044 M754.904,409.076l-2.484,2.484&#10;&#9;&#9;&#9;&#9;&#9;l-4.482,4.483l-2.484,2.484l2.484,2.484l4.482,4.483l2.484,2.484l2.483-2.484l4.482-4.483l2.484-2.484l-2.484-2.484&#10;&#9;&#9;&#9;&#9;&#9;l-4.482-4.483L754.904,409.076L754.904,409.076z"/>
			</g>
			<g>
				
					<path d="M 658.336975 413.601013 H 668.188975 V 423.453013 H 658.336975 V 413.601013 Z" transform="matrix(-0.7071 0.7071 -0.7071 -0.7071 1428.2103 245.499)" fill="#FFFFFF"/>
				<path fill="#1C1C1C" d="M663.263,414.044l4.483,4.482l-4.483,4.482l-4.482-4.482L663.263,414.044 M663.263,409.076l-2.484,2.484&#10;&#9;&#9;&#9;&#9;&#9;l-4.482,4.483l-2.484,2.484l2.484,2.484l4.482,4.483l2.484,2.484l2.484-2.484l4.482-4.483l2.484-2.484l-2.484-2.484&#10;&#9;&#9;&#9;&#9;&#9;l-4.482-4.483L663.263,409.076L663.263,409.076z"/>
			</g>
			<g>
				<path d="M 702.844971 415.356995 H 715.32297 V 421.696995 H 702.844971 V 415.356995 Z" fill="#FFFFFF"/>
				<path fill="#1C1C1C" d="M713.566,417.114v2.826h-8.965v-2.826H713.566 M717.079,413.601h-3.513h-8.965h-3.514v3.513v2.826v3.513&#10;&#9;&#9;&#9;&#9;&#9;h3.514h8.965h3.513v-3.513v-2.826V413.601L717.079,413.601z"/>
			</g>
			<g>
				<path d="M 702.4199829101562 471.29998779296875 L 702.4199829101562 461.6940002441406 L 715.7479858398438 461.6940002441406 L 715.7479858398438 471.29998779296875 L 709.083984375 476.42498779296875 Z" fill="#FFFFFF"/>
				<path fill="#1C1C1C" d="M713.991,463.45v6.984l-4.907,3.774l-4.908-3.774v-6.984h4.908H713.991 M717.504,459.938h-3.513h-4.907&#10;&#9;&#9;&#9;&#9;&#9;h-4.908h-3.513v3.513v6.984v1.729l1.371,1.055l4.907,3.775l2.143,1.648l2.142-1.648l4.907-3.775l1.371-1.055v-1.729v-6.984&#10;&#9;&#9;&#9;&#9;&#9;V459.938L717.504,459.938z"/>
			</g>
		</g>
	</g>
</g></svg>
`;

function BaseballField({ pins, onFieldClick, interactive = true, opacity }) {
  const hostRef = useRef(null);
  const overlayRef = useRef(null);
  const [viewBox, setViewBox] = useState('0 0 500 500');

  useEffect(() => {
    const svgEl = hostRef.current ? hostRef.current.querySelector('svg') : null;
    const vb = svgEl ? svgEl.getAttribute('viewBox') : null;
    if (vb) setViewBox(vb);
  }, []);

  function handleClick(evt) {
    if (!interactive) return;
    const svg = overlayRef.current;
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    const loc = pt.matrixTransform(svg.getScreenCTM().inverse());
    if (onFieldClick)
      onFieldClick({
        x: Math.round(loc.x * 10) / 10,
        y: Math.round(loc.y * 10) / 10,
      });
  }

  return (
    <div
      className="relative w-full select-none"
      style={{ position: 'relative' }}
    >
      <div
        ref={hostRef}
        className="field-svg-host w-full"
        style={opacity != null ? { opacity } : undefined}
        dangerouslySetInnerHTML={{ __html: FIELD_SVG_MARKUP }}
      />
      <svg
        ref={overlayRef}
        viewBox={viewBox}
        onClick={handleClick}
        className="absolute inset-0 w-full h-full"
        style={{
          cursor: interactive ? 'crosshair' : 'default',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
        }}
      >
        {pins}
      </svg>
    </div>
  );
}

/* ============================================================
   TRAJECTORY MARKERS
   ------------------------------------------------------------
   Every batted-ball pin is colored by outcome (hit/error/out) and
   linked to home plate by a line whose *shape* encodes the hit
   type: a curved arc for fly balls/pop ups, a dotted line for
   grounders, and a straight line for line drives.
   ============================================================ */
// Home plate's position within the field SVG's own coordinate
// space (see the viewBox baked into FIELD_SVG_MARKUP above).
const HOME_PLATE = { x: 709.084, y: 468.829 };

function trajectoryPathD(from, to, hitType) {
  if (hitType === 'Fly Ball' || hitType === 'Pop Up') {
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    const bow = 2; // how strongly the arc bends back toward the center-field line
    const ctrlX = midX + (from.x - midX) * bow;
    return `M ${from.x} ${from.y} Q ${ctrlX} ${midY} ${to.x} ${to.y}`;
  }
  // Grounders and line drives both travel a straight path — the
  // dotted vs. solid look is applied via strokeDasharray below.
  return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
}

function TrajectoryMark({
  home = HOME_PLATE,
  location,
  hitType,
  color,
  number,
  showNumber = true,
  tooltip,
  pulsing = false,
  radius = 6.5,
  fontSize = 7.5,
}) {
  const pathD = trajectoryPathD(home, location, hitType);
  const dotted = hitType === 'Grounder';
  // keep the little chalk center-dot in proportion as the pin grows
  const innerDotRadius = (1.5 / 6.5) * radius;

  return (
    <g>
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={dotted ? 3.25 : 2.75}
        strokeLinecap="round"
        strokeDasharray={dotted ? '0.1 7' : undefined}
      />
      {pulsing && (
        <circle
          cx={location.x}
          cy={location.y}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={2}
          className="pin-pulse"
        />
      )}
      <circle cx={location.x} cy={location.y} r={innerDotRadius} fill={COLORS.chalk} />
      <circle
        cx={location.x}
        cy={location.y}
        r={radius}
        fill={color}
        stroke={COLORS.chalk}
        strokeWidth={1}
      />
      {number != null && showNumber && (
        <text
          x={location.x}
          y={location.y}
          textAnchor="middle"
          dominantBaseline="central"
          className="font-display"
          fontSize={fontSize}
          fontWeight={700}
          fill={COLORS.chalk}
          style={{ pointerEvents: 'none' }}
        >
          {number}
        </text>
      )}
      {tooltip && <title>{tooltip}</title>}
    </g>
  );
}

/* ============================================================
   SMALL UI HELPERS
   ============================================================ */
function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&display=swap');
      .font-display { font-family: 'Oswald', sans-serif; }
      .field-svg-host { opacity: .6; }
      .field-svg-host svg { width: 100%; height: auto; display: block; }
      @keyframes pinPulse { 0% { r: 8.5; opacity: .85; } 70%, 100% { r: 20; opacity: 0; } }
      .pin-pulse { animation: pinPulse 1.3s ease-out infinite; }
      .card { background: ${COLORS.chalk}; border: 1px solid ${COLORS.border}; border-radius: 10px; box-shadow: 0 1px 2px rgba(42,37,32,.05); }
      .field-input { width:100%; border-radius:8px; padding:10px 12px; font-size:14px; background:${COLORS.chalk}; border:1px solid ${COLORS.border}; color:${COLORS.ink}; transition: border-color .15s, box-shadow .15s; }
      .field-input:focus { outline:none; border-color:${COLORS.grass}; box-shadow: 0 0 0 3px rgba(47,107,60,.15); }
      .field-input:disabled { background:${COLORS.paper}; color:${COLORS.inkFaint}; }
      .btn-primary { background:${COLORS.grass}; color:${COLORS.chalk}; border-radius:10px; font-weight:600; transition: background .15s; }
      .btn-primary:hover:not(:disabled) { background:${COLORS.grassDeep}; }
      .btn-primary:disabled { background:${COLORS.border}; color:${COLORS.inkFaint}; cursor: not-allowed; }
      .btn-secondary { background:${COLORS.paper}; color:${COLORS.ink}; border:1px solid ${COLORS.border}; border-radius:8px; transition: background .15s; }
      .btn-secondary:hover { background:${COLORS.border}; }
      .chip { display:inline-flex; align-items:center; font-size:11px; line-height:1; padding:4px 8px; border-radius:5px; background:${COLORS.paper}; color:${COLORS.inkFaint}; border:1px solid ${COLORS.border}; white-space:nowrap; }
      .counter-btn { display:inline-flex; align-items:center; justify-content:center; width:40px; height:40px; border-radius:999px; transition: background .15s, opacity .15s; }
      .counter-btn:disabled { opacity:.35; cursor:not-allowed; }
      .hand-toggle-btn { padding:10px 0; border-radius:8px; font-size:14px; font-weight:600; text-align:center; border:1px solid ${COLORS.border}; transition: background .15s, color .15s, border-color .15s; }

      .summary-title { font-family:'Oswald', sans-serif; font-size:26px; font-weight:700; color:${COLORS.ink}; padding-bottom:8px; margin-bottom:14px; border-bottom:3px solid ${COLORS.grass}; }
      .summary-section { margin-bottom:32px; }
      .summary-table { width:100%; border-collapse:collapse; table-layout:fixed; }
      .summary-table th { text-align:left; font-size:12px; font-weight:600; color:${COLORS.inkFaint}; padding:6px 8px; border-bottom:2px solid ${COLORS.ink}; }
      .summary-table td { vertical-align:top; padding:8px 8px; border-bottom:1px solid ${COLORS.border}; font-size:12.5px; color:${COLORS.ink}; }
      .summary-atbat-list { margin:0; padding:0; list-style:none; display:grid; grid-template-columns:1fr 1fr; column-gap:8px; }
      .summary-atbat-item { font-size:10px; line-height:1.3; }
      .summary-season-label { font-size:10px; font-weight:600; color:${COLORS.inkFaint}; margin-top:4px; }
      .summary-season-label:first-child { margin-top:0; }
      .summary-player-stats { font-size:10px; font-weight:600; color:${COLORS.inkFaint}; white-space:nowrap; }
      .summary-legend { font-size:12px; color:${COLORS.inkFaint}; line-height:1.5; }

      @media print {
        header, nav, .no-print { display:none !important; }
        body, .min-h-screen { background:#fff !important; }
        main { max-width:none !important; padding:0 !important; margin:0 !important; }
        .summary-table th, .summary-table td { border-color:#999 !important; }
        .summary-table tr { break-inside:avoid; }
        .summary-page-break { break-before:page; page-break-before:always; }
        * { -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
        @page { size:potrait; margin:5mm; }
      }
    `}</style>
  );
}

function Card({ title, children, className = '' }) {
  return (
    <div className={`card p-4 sm:p-5 ${className}`}>
      {title && (
        <h2
          className="text-[15px] font-semibold mb-3 pb-2"
          style={{
            color: COLORS.ink,
            borderBottom: `1px solid ${COLORS.border}`,
          }}
        >
          {title}
        </h2>
      )}
      {children}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select…',
  disabled = false,
}) {
  return (
    <div>
      {label && (
        <label
          className="block text-sm font-medium mb-1"
          style={{ color: COLORS.inkFaint }}
        >
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="field-input"
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

function CounterField({ label, value, onChange, min = 0 }) {
  return (
    <div>
      <label
        className="block text-sm font-medium mb-2"
        style={{ color: COLORS.inkFaint }}
      >
        {label}
      </label>
      <div className="flex items-center justify-center gap-5">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`Decrease ${label}`}
          className="counter-btn"
          style={{
            background: COLORS.paper,
            border: `1px solid ${COLORS.border}`,
            color: COLORS.ink,
          }}
        >
          <Minus size={18} />
        </button>
        <span
          className="font-display text-3xl font-semibold text-center"
          style={{ color: COLORS.grass, minWidth: 36 }}
        >
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          aria-label={`Increase ${label}`}
          className="counter-btn"
          style={{ background: COLORS.grass, color: COLORS.chalk }}
        >
          <Plus size={18} />
        </button>
      </div>
    </div>
  );
}

function HandToggle({ label, value, onChange }) {
  return (
    <div>
      {label && (
        <label
          className="block text-sm font-medium mb-1"
          style={{ color: COLORS.inkFaint }}
        >
          {label}
        </label>
      )}
      <div className="grid grid-cols-2 gap-2">
        {PITCHER_HANDS.map((hand) => {
          const active = value === hand;
          return (
            <button
              key={hand}
              type="button"
              onClick={() => onChange(hand)}
              className="hand-toggle-btn"
              style={{
                background: active ? COLORS.grass : COLORS.chalk,
                color: active ? COLORS.chalk : COLORS.ink,
                borderColor: active ? COLORS.grass : COLORS.border,
              }}
            >
              {hand} ({HAND_LETTER[hand]})
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Chip({ children }) {
  return <span className="chip">{children}</span>;
}

function LoadingScreen() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: COLORS.paper }}
    >
      <Loader2
        className="animate-spin"
        size={28}
        style={{ color: COLORS.grass }}
      />
    </div>
  );
}

/* ============================================================
   RECORD AT-BAT
   ============================================================ */
function RecordAtBatView({ teams, atbats, onSave }) {
  const teamNames = Object.keys(teams);
  const [team, setTeam] = useState('');
  const [player, setPlayer] = useState('');
  const [season, setSeason] = useState('');
  const [atBatNumber, setAtBatNumber] = useState(1);
  const [pitcherHand, setPitcherHand] = useState('');
  const [balls, setBalls] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [hitType, setHitType] = useState('');
  const [outcome, setOutcome] = useState('');
  const [location, setLocation] = useState(null);
  const [justSaved, setJustSaved] = useState(false);
  const [lastSavedPlayer, setLastSavedPlayer] = useState('');

  const players = team ? teams[team] || [] : [];

  const nextAtBatNumber = useMemo(() => {
    if (!team || !player) return 1;
    const count = atbats.filter(
      (a) => a.team === team && a.player === player
    ).length;
    return count + 1;
  }, [team, player, atbats]);

  useEffect(() => {
    setAtBatNumber(nextAtBatNumber);
  }, [nextAtBatNumber]);
  useEffect(() => {
    setPlayer('');
  }, [team]);

  const isStrikeout = hitType === 'Strikeout';
  const isWalk = hitType === 'Walk';
  const finalOutcome = isStrikeout ? 'Out' : isWalk ? 'Base on Balls' : outcome;
  const finalLocation = isStrikeout || isWalk ? null : location;

  const canSave = Boolean(
    team &&
      player &&
      season &&
      pitcherHand &&
      hitType &&
      (isStrikeout || isWalk || (finalLocation && finalOutcome))
  );

  function resetForNextAtBat() {
    setPlayer('');
    setBalls(0);
    setStrikes(0);
    setHitType('');
    setOutcome('');
    setLocation(null);
  }

  async function handleSave() {
    if (!canSave) return;
    const record = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      team,
      player,
      season: Number(season),
      atBatNumber,
      pitcherHand,
      balls,
      strikes,
      hitType,
      outcome: finalOutcome,
      location: finalLocation,
      timestamp: Date.now(),
    };
    setLastSavedPlayer(player);
    await onSave(record);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2200);
    resetForNextAtBat();
  }

  const recent = useMemo(
    () => [...atbats].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5),
    [atbats]
  );

  return (
    <div className="space-y-4">
      {justSaved && (
        <div
          className="rounded-lg px-4 py-2.5 text-sm font-medium flex items-center gap-2"
          style={{
            background: '#EAF3EB',
            color: COLORS.grassDeep,
            border: `1px solid ${COLORS.grassLight}`,
          }}
        >
          <Check size={16} /> At-bat saved
          {lastSavedPlayer ? ` for ${lastSavedPlayer}` : ''}.
        </div>
      )}

      <Card title="At-bat info">
        <div className="grid grid-cols-2 gap-3">
          <SelectField
            label="Team"
            value={team}
            onChange={setTeam}
            options={teamNames}
            placeholder="Select team…"
          />
          <SelectField
            label="Player"
            value={player}
            onChange={setPlayer}
            options={players}
            placeholder={
              !team
                ? 'Select team first'
                : players.length
                ? 'Select player…'
                : 'No players yet'
            }
            disabled={!team || players.length === 0}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: COLORS.inkFaint }}
            >
              Season
            </label>
            <select
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              className="field-input"
            >
              <option value="">Select…</option>
              <option value="1">Season 1</option>
              <option value="2">Season 2</option>
            </select>
          </div>
          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: COLORS.inkFaint }}
            >
              At-bat #
            </label>
            <select
              value={atBatNumber}
              onChange={(e) => setAtBatNumber(Number(e.target.value))}
              disabled={!player}
              className="field-input"
            >
              {Array.from(
                { length: Math.max(nextAtBatNumber, 1) },
                (_, i) => i + 1
              ).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-3">
          <HandToggle
            label="Pitcher throws"
            value={pitcherHand}
            onChange={setPitcherHand}
          />
        </div>
        {team && players.length === 0 && (
          <p className="text-xs mt-2" style={{ color: COLORS.inkFaint }}>
            {team} has no players yet — add one in the Rosters tab.
          </p>
        )}
      </Card>

      <Card title="Pitch count">
        <div className="text-center mb-4">
          <span
            className="font-display text-4xl font-semibold"
            style={{ color: COLORS.grass }}
          >
            {balls}-{strikes}
          </span>
          <p className="text-xs mt-1" style={{ color: COLORS.inkFaint }}>
            balls – strikes
          </p>
        </div>
        <div className="space-y-5">
          <CounterField label="Balls" value={balls} onChange={setBalls} />
          <CounterField label="Strikes" value={strikes} onChange={setStrikes} />
        </div>
      </Card>

      <Card title="Result">
        <SelectField
          label="Hit type"
          value={hitType}
          onChange={setHitType}
          options={HIT_TYPES}
          placeholder="Select…"
        />

        {hitType && !isStrikeout && !isWalk && (
          <div className="mt-4">
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: COLORS.inkFaint }}
            >
              Tap the field to pinpoint where it was hit
            </label>
            <BaseballField
              onFieldClick={setLocation}
              pins={
                location ? (
                  <TrajectoryMark
                    location={location}
                    hitType={hitType}
                    color={outcome ? OUTCOME_COLORS[outcome] : COLORS.inkFaint}
                    number={atBatNumber}
                    pulsing
                  />
                ) : null
              }
            />
            {location && (
              <button
                type="button"
                onClick={() => setLocation(null)}
                className="mt-2 text-sm"
                style={{ color: COLORS.inkFaint }}
              >
                Clear pin
              </button>
            )}
          </div>
        )}

        <div className="mt-4">
          {isStrikeout ? (
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: COLORS.inkFaint }}
              >
                Outcome
              </label>
              <div
                className="rounded-lg px-3 py-2.5 text-sm font-medium"
                style={{
                  background: '#F7EAE7',
                  color: COLORS.out,
                  border: `1px solid ${COLORS.out}55`,
                }}
              >
                Out (strikeout)
              </div>
            </div>
          ) : isWalk ? (
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: COLORS.inkFaint }}
              >
                Outcome
              </label>
              <div
                className="rounded-lg px-3 py-2.5 text-sm font-medium"
                style={{
                  background: '#E9F1F6',
                  color: COLORS.walk,
                  border: `1px solid ${COLORS.walk}55`,
                }}
              >
                Base on Balls (walk)
              </div>
            </div>
          ) : (
            <SelectField
              label="Outcome"
              value={outcome}
              onChange={setOutcome}
              options={OUTCOMES}
              placeholder="Select…"
            />
          )}
        </div>
      </Card>

      <button
        type="button"
        onClick={handleSave}
        disabled={!canSave}
        className="btn-primary w-full py-3.5"
      >
        Save at-bat
      </button>
      {!canSave && (team || player || hitType) && (
        <p className="text-center text-xs" style={{ color: COLORS.inkFaint }}>
          Fill in every field above
          {hitType && !isStrikeout && !isWalk ? ' and pinpoint the location' : ''} to save.
        </p>
      )}

      {recent.length > 0 && (
        <div className="pt-2">
          <h3
            className="text-sm font-semibold mb-2"
            style={{ color: COLORS.ink }}
          >
            Recently recorded
          </h3>
          <div className="space-y-1.5">
            {recent.map((r) => (
              <div
                key={r.id}
                className="card flex items-center justify-between gap-2 px-3 py-2"
              >
                <div className="min-w-0">
                  <div
                    className="text-sm font-medium truncate"
                    style={{ color: COLORS.ink }}
                  >
                    {r.player}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <Chip>S{r.season}</Chip>
                    <Chip>AB {r.atBatNumber}</Chip>
                    <Chip>
                      {r.balls}-{r.strikes}
                    </Chip>
                    {r.pitcherHand && (
                      <Chip>{HAND_LETTER[r.pitcherHand]}HP</Chip>
                    )}
                    <Chip>{r.hitType}</Chip>
                  </div>
                </div>
                <span
                  className="text-sm font-semibold shrink-0"
                  style={{ color: OUTCOME_COLORS[r.outcome] }}
                >
                  {r.outcome}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   ROSTERS
   ============================================================ */
function RostersView({
  teams,
  onAddTeam,
  onDeleteTeam,
  onAddPlayer,
  onDeletePlayer,
}) {
  const [newTeam, setNewTeam] = useState('');
  const [newPlayerInputs, setNewPlayerInputs] = useState({});
  const [confirming, setConfirming] = useState(null);

  const teamNames = Object.keys(teams);

  function submitTeam() {
    const n = newTeam.trim();
    if (!n) return;
    onAddTeam(n);
    setNewTeam('');
  }
  function submitPlayer(teamName) {
    const n = (newPlayerInputs[teamName] || '').trim();
    if (!n) return;
    onAddPlayer(teamName, n);
    setNewPlayerInputs((prev) => ({ ...prev, [teamName]: '' }));
  }

  return (
    <div className="space-y-4">
      <Card title="Add a team">
        <div className="flex gap-2">
          <input
            value={newTeam}
            onChange={(e) => setNewTeam(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitTeam();
            }}
            placeholder="Team name"
            className="field-input"
          />
          <button
            type="button"
            onClick={submitTeam}
            className="btn-primary shrink-0 px-4"
          >
            <Plus size={18} />
          </button>
        </div>
      </Card>

      {teamNames.length === 0 && (
        <p
          className="text-center text-sm py-6"
          style={{ color: COLORS.inkFaint }}
        >
          No teams yet. Add your first team above.
        </p>
      )}

      {teamNames.map((teamName) => {
        const players = teams[teamName];
        const teamConfirmKey = `team:${teamName}`;
        return (
          <Card key={teamName}>
            <div className="flex items-center justify-between mb-3">
              <h3
                className="text-[15px] font-semibold"
                style={{ color: COLORS.ink }}
              >
                {teamName}
              </h3>
              {confirming === teamConfirmKey ? (
                <span className="flex items-center gap-2 text-sm">
                  <span style={{ color: COLORS.inkFaint }}>Delete team?</span>
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteTeam(teamName);
                      setConfirming(null);
                    }}
                    className="font-medium"
                    style={{ color: COLORS.out }}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming(null)}
                    style={{ color: COLORS.inkFaint }}
                  >
                    No
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirming(teamConfirmKey)}
                  style={{ color: COLORS.inkFaint }}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            {players.length === 0 ? (
              <p className="text-sm mb-3" style={{ color: COLORS.inkFaint }}>
                No players yet.
              </p>
            ) : (
              <ul className="space-y-1 mb-3">
                {players.map((p) => {
                  const pKey = `player:${teamName}:${p}`;
                  return (
                    <li
                      key={p}
                      className="flex items-center justify-between rounded-lg px-3 py-1.5 text-sm"
                      style={{ background: COLORS.paper }}
                    >
                      <span style={{ color: COLORS.ink }}>{p}</span>
                      {confirming === pKey ? (
                        <span className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              onDeletePlayer(teamName, p);
                              setConfirming(null);
                            }}
                            className="font-medium"
                            style={{ color: COLORS.out }}
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirming(null)}
                            style={{ color: COLORS.inkFaint }}
                          >
                            No
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirming(pKey)}
                          style={{ color: COLORS.inkFaint }}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="flex gap-2">
              <input
                value={newPlayerInputs[teamName] || ''}
                onChange={(e) =>
                  setNewPlayerInputs((prev) => ({
                    ...prev,
                    [teamName]: e.target.value,
                  }))
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitPlayer(teamName);
                }}
                placeholder="Player name"
                className="field-input text-sm"
              />
              <button
                type="button"
                onClick={() => submitPlayer(teamName)}
                className="btn-secondary shrink-0 px-3"
              >
                <Plus size={16} />
              </button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

/* ============================================================
   HISTORY
   ============================================================ */
function HistoryView({ teams, atbats, onDelete }) {
  const [filterTeam, setFilterTeam] = useState('');
  const [filterPlayer, setFilterPlayer] = useState('');
  const [filterSeason, setFilterSeason] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const allTeamNames = useMemo(
    () =>
      Array.from(
        new Set([...Object.keys(teams), ...atbats.map((a) => a.team)])
      ).sort(),
    [teams, atbats]
  );
  const playerPool = useMemo(() => {
    const fromRoster = filterTeam
      ? teams[filterTeam] || []
      : Object.values(teams).flat();
    const fromAtbats = atbats
      .filter((a) => !filterTeam || a.team === filterTeam)
      .map((a) => a.player);
    return Array.from(new Set([...fromRoster, ...fromAtbats])).sort();
  }, [teams, atbats, filterTeam]);

  useEffect(() => {
    setFilterPlayer('');
  }, [filterTeam]);

  const filtered = atbats
    .filter((a) => !filterTeam || a.team === filterTeam)
    .filter((a) => !filterPlayer || a.player === filterPlayer)
    .filter((a) => !filterSeason || String(a.season) === filterSeason)
    .sort((a, b) => a.season - b.season || a.atBatNumber - b.atBatNumber);

  return (
    <div className="space-y-4">
      <Card title="Filters">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <SelectField
            label="Team"
            value={filterTeam}
            onChange={setFilterTeam}
            options={allTeamNames}
            placeholder="All teams"
          />
          <SelectField
            label="Player"
            value={filterPlayer}
            onChange={setFilterPlayer}
            options={playerPool}
            placeholder="All players"
          />
        </div>
        <div className="grid grid-cols-2 gap-3 items-end">
          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: COLORS.inkFaint }}
            >
              Season
            </label>
            <select
              value={filterSeason}
              onChange={(e) => setFilterSeason(e.target.value)}
              className="field-input"
            >
              <option value="">All seasons</option>
              <option value="1">Season 1</option>
              <option value="2">Season 2</option>
            </select>
          </div>
          <p className="text-sm pb-2.5" style={{ color: COLORS.inkFaint }}>
            {filtered.length} at-bat{filtered.length === 1 ? '' : 's'}
          </p>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <p
          className="text-center text-sm py-8"
          style={{ color: COLORS.inkFaint }}
        >
          No at-bats recorded yet.
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <div
              key={r.id}
              className="card flex items-center justify-between gap-2 px-3 py-2.5"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="text-sm font-semibold truncate"
                    style={{ color: COLORS.ink }}
                  >
                    {r.player}
                  </span>
                  <span
                    className="text-xs shrink-0"
                    style={{ color: COLORS.inkFaint }}
                  >
                    {r.team}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  <Chip>S{r.season}</Chip>
                  <Chip>AB {r.atBatNumber}</Chip>
                  <Chip>
                    {r.balls}-{r.strikes}
                  </Chip>
                  <Chip>{r.hitType}</Chip>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span
                  className="text-sm font-semibold"
                  style={{ color: OUTCOME_COLORS[r.outcome] }}
                >
                  {r.outcome}
                </span>
                {confirmDeleteId === r.id ? (
                  <span className="flex items-center gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        onDelete(r.id);
                        setConfirmDeleteId(null);
                      }}
                      className="font-medium"
                      style={{ color: COLORS.out }}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      style={{ color: COLORS.inkFaint }}
                    >
                      No
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(r.id)}
                    style={{ color: COLORS.border }}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   SPRAY CHART
   ============================================================ */
function StatBox({ label, value }) {
  return (
    <div className="text-center" style={{ minWidth: 44 }}>
      <div
        className="font-display text-xl font-semibold"
        style={{ color: COLORS.ink }}
      >
        {value}
      </div>
      <div className="text-[11px] mt-0.5" style={{ color: COLORS.inkFaint }}>
        {label}
      </div>
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <span
      className="flex items-center gap-1.5 text-xs"
      style={{ color: COLORS.inkFaint }}
    >
      <span
        className="inline-block rounded-full"
        style={{ width: 10, height: 10, background: color }}
      />
      {label}
    </span>
  );
}

function SprayChartView({ teams, atbats }) {
  const [team, setTeam] = useState('');
  const [player, setPlayer] = useState('');
  const [season, setSeason] = useState('');

  const allTeamNames = useMemo(
    () =>
      Array.from(
        new Set([...Object.keys(teams), ...atbats.map((a) => a.team)])
      ).sort(),
    [teams, atbats]
  );
  const playerPool = useMemo(() => {
    const fromRoster = team ? teams[team] || [] : [];
    const fromAtbats = atbats
      .filter((a) => !team || a.team === team)
      .map((a) => a.player);
    return Array.from(new Set([...fromRoster, ...fromAtbats])).sort();
  }, [teams, atbats, team]);

  useEffect(() => {
    setPlayer('');
  }, [team]);

  const playerAtBats = useMemo(
    () =>
      atbats
        .filter((a) => a.team === team && a.player === player)
        .filter((a) => !season || String(a.season) === season),
    [atbats, team, player, season]
  );

  const stats = useMemo(() => {
    const ab = playerAtBats.length;
    const hits = playerAtBats.filter((a) => a.outcome === 'Hit').length;
    const errors = playerAtBats.filter((a) => a.outcome === 'Error').length;
    const strikeouts = playerAtBats.filter(
      (a) => a.hitType === 'Strikeout'
    ).length;
    const outs = playerAtBats.filter((a) => a.outcome === 'Out').length;
    const walks = playerAtBats.filter(
      (a) => a.outcome === 'Base on Balls'
    ).length;
    const avg = ab ? hits / ab : 0;
    const bbPercent = ab ? walks / ab : 0;
    return { ab, hits, errors, outs, strikeouts, walks, avg, bbPercent };
  }, [playerAtBats]);

  const pins = playerAtBats
    .filter((a) => a.location)
    .map((a) => (
      <TrajectoryMark
        key={a.id}
        location={a.location}
        hitType={a.hitType}
        color={OUTCOME_COLORS[a.outcome]}
        number={a.atBatNumber}
        tooltip={`AB #${a.atBatNumber} · Season ${a.season} · Count ${a.balls}-${a.strikes} · ${a.hitType} · ${a.outcome}`}
      />
    ));

  return (
    <div className="space-y-4">
      <Card title="Select player">
        <div className="grid grid-cols-2 gap-3">
          <SelectField
            label="Team"
            value={team}
            onChange={setTeam}
            options={allTeamNames}
            placeholder="Select team…"
          />
          <SelectField
            label="Player"
            value={player}
            onChange={setPlayer}
            options={playerPool}
            placeholder={team ? 'Select player…' : 'Select team first'}
            disabled={!team}
          />
        </div>
        <div className="mt-3">
          <label
            className="block text-sm font-medium mb-1"
            style={{ color: COLORS.inkFaint }}
          >
            Season
          </label>
          <select
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            className="field-input"
          >
            <option value="">All seasons</option>
            <option value="1">Season 1</option>
            <option value="2">Season 2</option>
          </select>
        </div>
      </Card>

      {player && (
        <>
          <Card>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              <StatBox label="AB" value={stats.ab} />
              <StatBox label="H" value={stats.hits} />
              <StatBox label="E" value={stats.errors} />
              <StatBox label="O" value={stats.outs} />
              <StatBox label="K" value={stats.strikeouts} />
              <StatBox
                label="BB%"
                value={`${(stats.bbPercent * 100).toFixed(1)}%`}
              />
              <StatBox
                label="AVG"
                value={stats.avg.toFixed(3).replace(/^0/, '')}
              />
            </div>
          </Card>

          <Card title={`Spray chart — ${player}`}>
            {pins.length === 0 ? (
              <p
                className="text-center text-sm py-4"
                style={{ color: COLORS.inkFaint }}
              >
                No batted-ball locations for these filters yet.
              </p>
            ) : (
              <>
                <BaseballField pins={pins} interactive={false} />
                <div className="flex items-center justify-center gap-4 mt-3">
                  <LegendDot color={OUTCOME_COLORS.Hit} label="Hit" />
                  <LegendDot color={OUTCOME_COLORS.Error} label="Error" />
                  <LegendDot color={OUTCOME_COLORS.Out} label="Out" />
                </div>
              </>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

/* ============================================================
   SUMMARY (printable per-team report)
   ------------------------------------------------------------
   One row per roster player, with their at-bat log next to a
   spray chart for each season and a blank field reserved for
   the next tournament. Pin numbers match the numbered at-bat
   list so the two can be cross-referenced on a printout.
   ============================================================ */
const HIT_TYPE_ABBR = {
  Grounder: 'GB',
  'Fly Ball': 'FB',
  'Line Drive': 'LD',
  'Pop Up': 'PU',
  Strikeout: 'K',
  Walk: 'BB',
};

function AtBatInfoCell({ records }) {
  if (records.length === 0) {
    return (
      <span className="text-xs italic" style={{ color: COLORS.inkFaint }}>
        No at-bats yet
      </span>
    );
  }

  const bySeason = {};
  records.forEach((r) => {
    (bySeason[r.season] = bySeason[r.season] || []).push(r);
  });
  const seasons = Object.keys(bySeason)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <>
      {seasons.map((s) => (
        <div key={s}>
          <div className="summary-season-label">Season {s}</div>
          <ol className="summary-atbat-list">
            {[...bySeason[s]]
              .sort((a, b) => a.atBatNumber - b.atBatNumber)
              .map((r) => (
                <li
                  key={r.id}
                  className="summary-atbat-item flex items-start gap-1 py-0.5"
                >
                  <span
                    className="inline-block rounded-full shrink-0"
                    style={{
                      width: 6,
                      height: 6,
                      marginTop: 3,
                      background: OUTCOME_COLORS[r.outcome],
                    }}
                  />
                  <span>
                    {r.atBatNumber}. {r.balls}-{r.strikes}{' '}
                    {HAND_LETTER[r.pitcherHand]}
                    {HIT_TYPE_ABBR[r.hitType]
                      ? ` (${HIT_TYPE_ABBR[r.hitType]})`
                      : ''}
                  </span>
                </li>
              ))}
          </ol>
        </div>
      ))}
    </>
  );
}

function MiniSprayChart({ records = [] }) {
  const pins = records
    .filter((a) => a.location)
    .map((a) => (
      <TrajectoryMark
        key={a.id}
        location={a.location}
        hitType={a.hitType}
        color={OUTCOME_COLORS[a.outcome]}
        number={a.atBatNumber}
        tooltip={`AB #${a.atBatNumber} · Season ${a.season} · ${a.balls}-${a.strikes} · ${a.hitType} · ${a.outcome}`}
        radius={SUMMARY_PIN_RADIUS}
        fontSize={SUMMARY_PIN_FONT_SIZE}
      />
    ));
  return (
    <div style={{ maxWidth: 170, margin: '0 auto' }}>
      <BaseballField
        pins={pins}
        interactive={false}
        opacity={SUMMARY_FIELD_OPACITY}
      />
    </div>
  );
}

function PlayerStatLine({ records }) {
  const ab = records.length;
  const hits = records.filter((a) => a.outcome === 'Hit').length;
  const strikeouts = records.filter((a) => a.hitType === 'Strikeout').length;
  const walks = records.filter((a) => a.outcome === 'Base on Balls').length;

  return (
    <span className="summary-player-stats">
      {ab}AB · {hits}H · {strikeouts}K · {walks}BB
    </span>
  );
}

function SummaryView({ teams, atbats }) {
  const teamNames = Object.keys(teams);
  const [selectedTeam, setSelectedTeam] = useState('');

  const teamsToShow = selectedTeam ? [selectedTeam] : teamNames;

  function recordsFor(teamName, player) {
    return atbats.filter((a) => a.team === teamName && a.player === player);
  }

  return (
    <div className="space-y-4">
      <Card title="Print summary" className="no-print">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <SelectField
              label="Team"
              value={selectedTeam}
              onChange={setSelectedTeam}
              options={teamNames}
              placeholder="All teams"
            />
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="btn-primary px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-2 shrink-0"
          >
            <Printer size={16} /> Print / save as PDF
          </button>
        </div>
        <p className="text-xs mt-3" style={{ color: COLORS.inkFaint }}>
          Numbers on each spray chart match the numbered at-bats listed for
          that player. Choose "Save as PDF" as the destination when the print
          dialog opens.
        </p>
      </Card>

      {teamNames.length === 0 && (
        <p
          className="text-center text-sm py-8"
          style={{ color: COLORS.inkFaint }}
        >
          No teams yet — add one in the Rosters tab first.
        </p>
      )}

      {teamsToShow.map((teamName, idx) => {
        const players = teams[teamName] || [];
        return (
          <div
            key={teamName}
            className={`summary-section ${
              idx > 0 ? 'summary-page-break' : ''
            }`}
          >
            <div className="summary-title">{teamName}</div>

            {players.length === 0 ? (
              <p className="text-sm" style={{ color: COLORS.inkFaint }}>
                No players on this roster yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="summary-table">
                  <colgroup>
                    <col style={{ width: `${SUMMARY_ATBATINFO_COL_WIDTH}%` }} />
                    <col style={{ width: '20%' }} />
                    <col style={{ width: '20%' }} />
                    <col style={{ width: '20%' }} />
                    <col style={{ width: `${SUMMARY_NOTES_COL_WIDTH}%` }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>Season 1</th>
                      <th>Season 2</th>
                      <th>Tournament</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.map((player) => {
                      const allRecords = recordsFor(teamName, player);
                      const s1Records = allRecords.filter(
                        (a) => a.season === 1
                      );
                      const s2Records = allRecords.filter(
                        (a) => a.season === 2
                      );
                      return (
                        <tr key={player}>
                          <td>
                            <div className="flex items-baseline flex-wrap gap-x-2 mb-1">
                              <span className="font-medium">{player}</span>
                              <PlayerStatLine records={allRecords} />
                            </div>
                            <AtBatInfoCell records={allRecords} />
                          </td>
                          <td>
                            <MiniSprayChart records={s1Records} />
                          </td>
                          <td>
                            <MiniSprayChart records={s2Records} />
                          </td>
                          <td>
                            <MiniSprayChart records={[]} />
                          </td>
                          <td>&nbsp;</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="summary-legend flex flex-wrap gap-4 mt-3">
              <LegendDot color={OUTCOME_COLORS.Hit} label="Hit" />
              <LegendDot color={OUTCOME_COLORS.Error} label="Error" />
              <LegendDot color={OUTCOME_COLORS.Out} label="Out" />
              <LegendDot
                color={OUTCOME_COLORS['Base on Balls']}
                label="Walk"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   DATA (export / import — bridges to a real DB or spreadsheet)
   ============================================================ */
function DataView({ teams, atbats, onImport }) {
  const [showExport, setShowExport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const [confirmImport, setConfirmImport] = useState(false);

  const exportString = useMemo(
    () => JSON.stringify({ teams, atbats }, null, 2),
    [teams, atbats]
  );

  function handleImport() {
    try {
      const parsed = JSON.parse(importText);
      if (
        !parsed ||
        typeof parsed !== 'object' ||
        !parsed.teams ||
        !parsed.atbats
      ) {
        throw new Error('bad shape');
      }
      if (!confirmImport) {
        setConfirmImport(true);
        setImportError('');
        return;
      }
      onImport(parsed.teams, parsed.atbats);
      setImportText('');
      setConfirmImport(false);
      setImportError('');
    } catch (e) {
      setImportError("That doesn't look like valid exported JSON.");
      setConfirmImport(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card title="Export">
        <p className="text-sm mb-3" style={{ color: COLORS.inkFaint }}>
          Copy every roster and at-bat as JSON — for backing up, or moving this
          data into a spreadsheet or a real database later.
        </p>
        <button
          type="button"
          onClick={() => setShowExport((s) => !s)}
          className="btn-secondary px-4 py-2 text-sm font-medium"
        >
          {showExport ? 'Hide' : 'Show'} export data
        </button>
        {showExport && (
          <textarea
            readOnly
            value={exportString}
            onFocus={(e) => e.target.select()}
            className="field-input mt-3 h-40 text-xs"
            style={{ fontFamily: 'monospace' }}
          />
        )}
      </Card>

      <Card title="Import">
        <p className="text-sm mb-3" style={{ color: COLORS.inkFaint }}>
          Paste previously exported JSON below. This replaces all current
          rosters and at-bats.
        </p>
        <textarea
          value={importText}
          onChange={(e) => {
            setImportText(e.target.value);
            setConfirmImport(false);
            setImportError('');
          }}
          placeholder='{"teams": {...}, "atbats": [...]}'
          className="field-input h-32 text-xs"
          style={{ fontFamily: 'monospace' }}
        />
        {importError && (
          <p className="text-sm mt-2" style={{ color: COLORS.out }}>
            {importError}
          </p>
        )}
        <div className="flex items-center gap-2 mt-3">
          <button
            type="button"
            onClick={handleImport}
            disabled={!importText.trim()}
            className="btn-primary px-4 py-2 text-sm"
          >
            {confirmImport ? 'Confirm — replace all data' : 'Import'}
          </button>
          {confirmImport && (
            <button
              type="button"
              onClick={() => setConfirmImport(false)}
              className="text-sm"
              style={{ color: COLORS.inkFaint }}
            >
              Cancel
            </button>
          )}
        </div>
      </Card>
    </div>
  );
}

/* ============================================================
   SHELL
   ============================================================ */
const TABS = [
  { id: 'record', label: 'Record', icon: Plus },
  { id: 'rosters', label: 'Rosters', icon: Users },
  { id: 'history', label: 'History', icon: Clock },
  { id: 'spray', label: 'Spray chart', icon: Target },
  { id: 'summary', label: 'Summary', icon: ClipboardList },
  { id: 'data', label: 'Data', icon: Database },
];

function Header() {
  return (
    <header style={{ background: COLORS.grass }}>
      <div className="max-w-2xl mx-auto px-4 py-5">
        <h1
          className="font-display text-2xl font-semibold tracking-wide"
          style={{ color: COLORS.chalk }}
        >
          INTER UNI BASEBALL STAT TRACKER
        </h1>
        <p className="text-sm mt-0.5" style={{ color: '#DCEADC' }}>
          At-bat tracker &amp; spray charts
        </p>
      </div>
    </header>
  );
}

function TabBar({ tab, setTab }) {
  return (
    <nav
      className="sticky top-0 z-10"
      style={{
        background: COLORS.chalk,
        borderBottom: `1px solid ${COLORS.border}`,
      }}
    >
      <div className="max-w-2xl mx-auto flex overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className="flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap"
              style={{
                color: active ? COLORS.grass : COLORS.inkFaint,
                borderBottom: `2px solid ${
                  active ? COLORS.grass : 'transparent'
                }`,
              }}
            >
              <Icon size={16} />
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default function App() {
  const [teams, setTeams] = useState({});
  const [atbats, setAtbats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('record');
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    (async () => {
      const [t, a] = await Promise.all([
        loadJSON(STORAGE_KEYS.TEAMS, {}),
        loadJSON(STORAGE_KEYS.ATBATS, []),
      ]);
      setTeams(t);
      setAtbats(a);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (saveError) {
      const t = setTimeout(() => setSaveError(false), 4000);
      return () => clearTimeout(t);
    }
  }, [saveError]);

  async function persistTeams(next) {
    setTeams(next);
    const ok = await saveJSON(STORAGE_KEYS.TEAMS, next);
    setSaveError(!ok);
  }
  async function persistAtbats(next) {
    setAtbats(next);
    const ok = await saveJSON(STORAGE_KEYS.ATBATS, next);
    setSaveError(!ok);
  }

  function handleAddTeam(name) {
    const n = name.trim();
    if (!n || teams[n]) return;
    persistTeams({ ...teams, [n]: [] });
  }
  function handleDeleteTeam(name) {
    const next = { ...teams };
    delete next[name];
    persistTeams(next);
  }
  function handleAddPlayer(teamName, name) {
    const n = name.trim();
    if (!n || !teams[teamName] || teams[teamName].includes(n)) return;
    persistTeams({ ...teams, [teamName]: [...teams[teamName], n] });
  }
  function handleDeletePlayer(teamName, playerName) {
    persistTeams({
      ...teams,
      [teamName]: teams[teamName].filter((p) => p !== playerName),
    });
  }
  async function handleSaveAtBat(record) {
    await persistAtbats([...atbats, record]);
  }
  function handleDeleteAtBat(id) {
    persistAtbats(atbats.filter((a) => a.id !== id));
  }
  function handleImport(newTeams, newAtbats) {
    persistTeams(newTeams);
    persistAtbats(newAtbats);
  }

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen" style={{ background: COLORS.paper }}>
      <GlobalStyles />
      <Header />
      <TabBar tab={tab} setTab={setTab} />
      <main className="max-w-2xl mx-auto px-4 pb-16 pt-4">
        {tab === 'record' && (
          <RecordAtBatView
            teams={teams}
            atbats={atbats}
            onSave={handleSaveAtBat}
          />
        )}
        {tab === 'rosters' && (
          <RostersView
            teams={teams}
            onAddTeam={handleAddTeam}
            onDeleteTeam={handleDeleteTeam}
            onAddPlayer={handleAddPlayer}
            onDeletePlayer={handleDeletePlayer}
          />
        )}
        {tab === 'history' && (
          <HistoryView
            teams={teams}
            atbats={atbats}
            onDelete={handleDeleteAtBat}
          />
        )}
        {tab === 'spray' && <SprayChartView teams={teams} atbats={atbats} />}
        {tab === 'summary' && (
          <SummaryView teams={teams} atbats={atbats} />
        )}
        {tab === 'data' && (
          <DataView teams={teams} atbats={atbats} onImport={handleImport} />
        )}
      </main>
      {saveError && (
        <div
          className="fixed bottom-4 left-1/2 text-sm px-4 py-2 rounded-lg shadow-lg"
          style={{
            transform: 'translateX(-50%)',
            background: COLORS.out,
            color: COLORS.chalk,
          }}
        >
          Couldn't save — your last change may not have persisted.
        </div>
      )}
    </div>
  );
}
