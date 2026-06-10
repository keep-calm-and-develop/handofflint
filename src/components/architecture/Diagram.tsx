import Link from "next/link";

import { FIGMA_COLORS } from "../layout/figma-colors";

const DIAGRAM_LINK =
  "transition-shadow hover:shadow-md hover:ring-2 hover:ring-offset-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 rounded-lg";

export function SystemArchitectureFlowDiagram() {
  const colors = FIGMA_COLORS;

  return (
    <div className="mt-8 max-w-7xl mx-auto bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm overflow-x-auto">
      {/* Fixed Width Workspace to prevent SVG arrow misalignment on resize */}
      <div className="w-[1240px] h-[640px] relative mx-auto select-none bg-slate-50/50 rounded-xl border border-slate-100 overflow-hidden">
        {/* BACKGROUND BLUEPRINT GRID LINES */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `radial-gradient(#cad1db 1px, transparent 1px)`,
            backgroundSize: "16px 16px",
          }}
        />

        {/* SVG CONNECTIONS & FLOW ARROWS LAYER */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Colored Triangle Arrow Markers */}
            <marker
              id="arrow-blue"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill={colors.blue} />
            </marker>
            <marker
              id="arrow-purple"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill={colors.purple} />
            </marker>
            <marker
              id="arrow-orange"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill={colors.orange} />
            </marker>
            <marker
              id="arrow-green"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill={colors.green} />
            </marker>
          </defs>

          {/* 1. User Input -> Wizard Dashboard */}
          <path
            d="M 60 145 C 90 145 75 195 100 195"
            stroke="#94a3b8"
            strokeWidth="2"
            strokeDasharray="3"
            fill="none"
            markerEnd="url(#arrow-blue)"
          />

          {/* 2. Step 1 (URL) -> POST /api/agent/init */}
          <path
            d="M 300 245 C 350 245 350 150 400 150"
            stroke={colors.blue}
            strokeWidth="2.5"
            fill="none"
            markerEnd="url(#arrow-blue)"
          />

          {/* 3. Step 2 (Profile) -> POST /api/agent/audit */}
          <path
            d="M 300 325 C 350 325 350 250 400 250"
            stroke={colors.blue}
            strokeWidth="2.5"
            fill="none"
            markerEnd="url(#arrow-blue)"
          />

          {/* 4. Step 3 (Launch Vision) -> POST /api/agent/vision */}
          <path
            d="M 300 445 C 350 445 350 440 400 440"
            stroke={colors.blue}
            strokeWidth="2.5"
            fill="none"
            markerEnd="url(#arrow-blue)"
          />

          {/* 5. POST /api/agent/vision -> Step 4 (Display) */}
          <path
            d="M 400 460 C 350 460 350 525 300 525"
            stroke={colors.blue}
            strokeWidth="2.5"
            fill="none"
            markerEnd="url(#arrow-blue)"
          />

          {/* 6. POST /api/agent/init -> Figma API (Fetch Tree) */}
          <path
            d="M 620 150 C 750 130 950 130 1085 190"
            stroke={colors.purple}
            strokeWidth="2.5"
            fill="none"
            markerEnd="url(#arrow-purple)"
          />

          {/* 7. POST /api/agent/audit -> Flat Index Cache (Save) */}
          <path
            d="M 620 255 C 670 255 670 545 590 545"
            stroke={colors.purple}
            strokeWidth="2"
            fill="none"
            markerEnd="url(#arrow-purple)"
          />

          {/* 8. POST /api/agent/vision -> Flat Index Cache (Read/Write) */}
          <path
            d="M 510 470 L 510 500"
            stroke={colors.purple}
            strokeWidth="2"
            fill="none"
            markerEnd="url(#arrow-purple)"
          />

          {/* 9. POST /api/agent/vision <-> Gemini 2.5 (Start Loop / Stream JSON) */}
          <path
            d="M 620 430 Q 690 410 760 420"
            stroke={colors.orange}
            strokeWidth="2"
            fill="none"
            markerEnd="url(#arrow-orange)"
          />
          <path
            d="M 760 432 Q 690 452 620 442"
            stroke={colors.orange}
            strokeWidth="2"
            fill="none"
            markerEnd="url(#arrow-orange)"
          />

          {/* 10. inspect_node tool -> Flat Index Cache (Lookup Props) */}
          <path
            d="M 720 492 C 660 492 660 545 590 545"
            stroke={colors.orange}
            strokeWidth="2.5"
            fill="none"
            markerEnd="url(#arrow-orange)"
          />

          {/* 11. search_guides tool -> GitHub Raw (Fetch Markdown) */}
          <path
            d="M 980 500 C 1015 500 1045 500 1068 500"
            stroke={colors.orange}
            strokeWidth="2.5"
            fill="none"
            markerEnd="url(#arrow-orange)"
          />
        </svg>

        {/* ARROW LABEL ANNOTATIONS (Overlay Text Blocks) */}
        <div
          className="absolute text-[10px] font-mono font-bold bg-white px-2 py-0.5 rounded shadow-sm border border-slate-100"
          style={{ left: "320px", top: "185px", color: colors.blue }}
        >
          POST URL
        </div>
        <div
          className="absolute text-[10px] font-mono font-bold bg-white px-2 py-0.5 rounded shadow-sm border border-slate-100"
          style={{ left: "315px", top: "275px", color: colors.blue }}
        >
          POST Profile
        </div>
        <div
          className="absolute text-[10px] font-mono font-bold bg-white px-2 py-0.5 rounded shadow-sm border border-slate-100"
          style={{ left: "315px", top: "415px", color: colors.blue }}
        >
          POST Image
        </div>
        <div
          className="absolute text-[10px] font-mono font-bold bg-white px-2 py-0.5 rounded shadow-sm border border-slate-100"
          style={{ left: "330px", top: "480px", color: colors.blue }}
        >
          Display
        </div>
        <div
          className="absolute text-[10px] font-mono font-bold bg-white px-2 py-0.5 rounded shadow-sm border border-slate-100"
          style={{ left: "810px", top: "120px", color: colors.purple }}
        >
          Fetch Tree
        </div>
        <div
          className="absolute text-[10px] font-mono font-bold bg-white px-2 py-0.5 rounded shadow-sm border border-slate-100"
          style={{ left: "630px", top: "350px", color: colors.purple }}
        >
          Save
        </div>
        <div
          className="absolute text-[10px] font-mono font-bold bg-white px-2 py-0.5 rounded shadow-sm border border-slate-100"
          style={{ left: "630px", top: "395px", color: colors.orange }}
        >
          Start Loop
        </div>
        <div
          className="absolute text-[10px] font-mono font-bold bg-white px-2 py-0.5 rounded shadow-sm border border-slate-100"
          style={{ left: "630px", top: "455px", color: colors.orange }}
        >
          Stream JSON
        </div>
        <div
          className="absolute text-[10px] font-mono font-bold bg-white px-2 py-0.5 rounded shadow-sm border border-slate-100"
          style={{ left: "650px", top: "520px", color: colors.orange }}
        >
          Lookup Props
        </div>
        <div
          className="absolute text-[10px] font-mono font-bold bg-white px-2 py-0.5 rounded shadow-sm border border-slate-100"
          style={{ left: "950px", top: "505px", color: colors.orange }}
        >
          Fetch Markdown
        </div>

        {/* DIAGRAM FLOW STATIONS */}

        {/* USER STATIC NODE */}
        <div className="absolute left-[20px] top-[100px] flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-full border border-slate-300 bg-white flex items-center justify-center shadow-sm">
            <svg
              className="w-6 h-6 text-slate-500"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <span className="text-[10px] font-bold font-mono tracking-wider text-slate-600 uppercase">
            User
          </span>
        </div>

        {/* COLUMN 1: WIZARD DASHBOARD */}
        <div
          className="absolute left-[100px] top-[180px] w-[220px] h-[400px] rounded-xl border p-4 flex flex-col justify-between"
          style={{
            borderColor: `${colors.blue}40`,
            backgroundColor: `${colors.blue}08`,
          }}
        >
          <span
            className="text-[10px] uppercase font-mono font-black tracking-wider"
            style={{ color: colors.blue }}
          >
            Wizard Dashboard
          </span>

          <div className="space-y-4 my-auto">
            {/* Step 1 */}
            <div
              className="bg-white border p-3 rounded-lg text-center shadow-sm"
              style={{ borderColor: `${colors.blue}50` }}
            >
              <span
                className="text-[9px] font-bold font-mono block mb-0.5"
                style={{ color: colors.blue }}
              >
                STEP 1
              </span>
              <p className="text-xs font-bold text-slate-800">
                1. Input Figma URL
              </p>
            </div>
            {/* Step 2 */}
            <div
              className="bg-white border p-3 rounded-lg text-center shadow-sm"
              style={{ borderColor: `${colors.blue}50` }}
            >
              <span
                className="text-[9px] font-bold font-mono block mb-0.5"
                style={{ color: colors.blue }}
              >
                STEP 2
              </span>
              <p className="text-xs font-bold text-slate-800">
                2. Select Profile
              </p>
            </div>
            {/* Step 3 */}
            <div
              className="bg-white border p-3 rounded-lg text-center shadow-sm"
              style={{ borderColor: `${colors.blue}50` }}
            >
              <span
                className="text-[9px] font-bold font-mono block mb-0.5"
                style={{ color: colors.blue }}
              >
                STEP 3
              </span>
              <p className="text-xs font-bold text-slate-800">
                3. Launch Vision
              </p>
            </div>
            {/* Step 4 */}
            <div
              className="bg-white border p-3 rounded-lg text-center shadow-sm"
              style={{ borderColor: `${colors.blue}50` }}
            >
              <span
                className="text-[9px] font-bold font-mono block mb-0.5"
                style={{ color: colors.blue }}
              >
                STEP 4
              </span>
              <p className="text-xs font-bold text-slate-800">
                4. View Results
              </p>
            </div>
          </div>

          <div className="text-[9px] font-mono text-slate-400 text-center uppercase tracking-wide">
            Wizard state machine
          </div>
        </div>

        {/* COLUMN 2: BACKEND API */}
        <div
          className="absolute left-[380px] top-[70px] w-[260px] h-[530px] rounded-xl border p-4 flex flex-col justify-between"
          style={{
            borderColor: `${colors.purple}40`,
            backgroundColor: `${colors.purple}08`,
          }}
        >
          <span
            className="text-[10px] uppercase font-mono font-black tracking-wider"
            style={{ color: colors.purple }}
          >
            Backend API
          </span>

          <div className="space-y-4 my-auto">
            {/* Init Endpoint */}
            <div
              className="bg-white border p-3 rounded-lg shadow-sm"
              style={{ borderColor: `${colors.purple}40` }}
            >
              <span className="text-[8px] font-mono font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                POST
              </span>
              <h4 className="text-xs font-bold text-slate-800 mt-1">
                /api/agent/init
              </h4>
              <p className="text-[9px] text-slate-500 mt-0.5">
                Parses Figma URL, saves mapped tree flat.
              </p>
            </div>

            {/* Audit Endpoint */}
            <div
              className="bg-white border p-3 rounded-lg shadow-sm space-y-2"
              style={{ borderColor: `${colors.purple}40` }}
            >
              <div>
                <span className="text-[8px] font-mono font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                  POST
                </span>
                <h4 className="text-xs font-bold text-slate-800 mt-1">
                  /api/agent/audit
                </h4>
              </div>
              {/* 8 Check Grid */}
              <div className="grid grid-cols-2 gap-1 text-[8px] font-mono font-bold text-purple-700">
                <div className="bg-purple-50 p-1 rounded text-center border border-purple-100">
                  runNaming
                </div>
                <div className="bg-purple-50 p-1 rounded text-center border border-purple-100">
                  runLayout
                </div>
                <div className="bg-purple-50 p-1 rounded text-center border border-purple-100">
                  runHidden
                </div>
                <div className="bg-purple-50 p-1 rounded text-center border border-purple-100">
                  runSpacing
                </div>
                <div className="bg-purple-50 p-1 rounded text-center border border-purple-100">
                  runContrast
                </div>
                <div className="bg-purple-50 p-1 rounded text-center border border-purple-100">
                  runSvg
                </div>
                <div className="bg-purple-50 p-1 rounded text-center border border-purple-100">
                  runExport
                </div>
                <div className="bg-purple-50 p-1 rounded text-center border border-purple-100">
                  runReuse
                </div>
              </div>
            </div>

            {/* Vision Endpoint */}
            <Link
              href="/guardrails"
              className={`block bg-white border p-3 shadow-sm ${DIAGRAM_LINK}`}
              style={{ borderColor: `${colors.purple}40` }}
              title="Cross-modal guardrails walkthrough"
            >
              <span className="text-[8px] font-mono font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                POST
              </span>
              <h4 className="text-xs font-bold text-slate-800 mt-1">
                /api/agent/vision
              </h4>
              <p className="text-[9px] text-slate-500 mt-0.5">
                Executes streaming multi-turn loop.
              </p>
              <p className="text-[8px] font-mono text-purple-600 mt-1">
                → guardrails
              </p>
            </Link>
          </div>

          {/* Flat Index Cache — Upstash Redis */}
          <div
            className="bg-white border p-2.5 rounded-lg flex items-center justify-between shadow-sm"
            style={{ borderColor: `${colors.green}50` }}
          >
            <div className="flex items-center gap-2">
              {/* Cylinder Database SVG */}
              <svg
                className="w-6 h-6"
                style={{ fill: `${colors.green}20`, stroke: colors.green }}
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <ellipse cx="12" cy="5" rx="9" ry="3" />
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
              </svg>
              <div>
                <span className="text-[8px] font-mono text-slate-400 block leading-tight">
                  Flat Index
                </span>
                <span className="text-[11px] font-bold text-slate-800">
                  Redis (Upstash)
                </span>
              </div>
            </div>
            <span className="text-[8px] font-mono px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded font-bold border border-emerald-100">
              O(1) Props
            </span>
          </div>
        </div>

        {/* COLUMN 3: REACT VISION AGENT */}
        <div
          className="absolute left-[700px] top-[70px] w-[310px] h-[530px] rounded-xl border p-4 flex flex-col justify-between"
          style={{
            borderColor: `${colors.orange}40`,
            backgroundColor: `${colors.orange}08`,
          }}
        >
          <Link
            href="/react-loop"
            className={`text-[10px] uppercase font-mono font-black tracking-wider hover:underline ${DIAGRAM_LINK}`}
            style={{ color: colors.orange }}
            title="ReAct vision loop walkthrough"
          >
            ReAct Vision Agent
          </Link>

          {/* Core Gemini Module */}
          <div className="my-auto space-y-6">
            {/* Gemini Star Box */}
            <Link
              href="/react-loop"
              className={`block bg-white border p-4 text-center shadow-sm relative overflow-hidden ${DIAGRAM_LINK}`}
              style={{ borderColor: `${colors.orange}40` }}
              title="ReAct vision loop walkthrough"
            >
              {/* Decorative plus signs matching original mockup */}
              <span className="absolute top-2 right-4 text-xs font-semibold text-orange-400">
                +
              </span>
              <span className="absolute bottom-2 left-4 text-xs font-semibold text-orange-400">
                +
              </span>

              {/* Gemini Star Core Icon */}
              <div
                className="w-10 h-10 rounded-full mx-auto flex items-center justify-center mb-2"
                style={{ backgroundColor: `${colors.orange}15` }}
              >
                <svg
                  className="w-6 h-6"
                  style={{ fill: colors.orange }}
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2l2.4 7.2L21.6 12l-7.2 2.4L12 21.6l-2.4-7.2-7.2-2.4 7.2-2.4z" />
                </svg>
              </div>

              <h4 className="text-xs font-bold text-slate-800">
                Gemini 2.5 Flash Core
              </h4>
              <p className="text-[9px] font-mono text-slate-500 mt-1 uppercase tracking-wider">
                max steps: 5 (ReAct Loop)
              </p>
            </Link>

            {/* Tools list container */}
            <div className="space-y-2">
              <span className="text-[9px] uppercase font-mono text-center block font-black text-slate-400">
                Registered Local Tools
              </span>

              {/* inspect_node */}
              <Link
                href="/inspect-node"
                className={`block bg-white border p-3 shadow-sm text-center ${DIAGRAM_LINK}`}
                style={{ borderColor: `${colors.orange}30` }}
                title="inspect_node shallow lookup walkthrough"
              >
                <span className="text-xs font-bold text-slate-800 font-mono block">
                  inspect_node
                </span>
                <span className="text-[9px] text-slate-500 leading-tight">
                  Reads shallow properties, strips children
                </span>
              </Link>

              {/* search_guides */}
              <Link
                href="/rag"
                className={`block bg-white border p-3 shadow-sm text-center ${DIAGRAM_LINK}`}
                style={{ borderColor: `${colors.orange}30` }}
                title="search_guides RAG pipeline walkthrough"
              >
                <span className="text-xs font-bold text-slate-800 font-mono block">
                  search_guides
                </span>
                <span className="text-[9px] text-slate-500 leading-tight">
                  Single-file markdown RAG pipeline
                </span>
              </Link>
            </div>
          </div>

          <div className="text-[9px] font-mono text-slate-400 text-center uppercase tracking-wide">
            autonomous tool calling loop
          </div>
        </div>

        {/* COLUMN 4: EXTERNAL PORTALS */}
        <div className="absolute left-[1070px] top-[70px] w-[130px] h-[530px] rounded-xl border border-slate-200 bg-slate-100/50 p-4 flex flex-col justify-around">
          <span className="text-[10px] uppercase font-mono font-black tracking-wider text-slate-400 text-center">
            External
          </span>

          {/* FIGMA WEB ENDPOINT */}
          <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-sm text-center space-y-2">
            <div>
              <h4 className="text-xs font-bold text-slate-800">Figma API</h4>
              <p className="text-[8px] text-slate-400 mt-0.5">
                Subtree fetcher
              </p>
            </div>
          </div>

          {/* GITHUB MARKDOWN DIRECTIVE ENDPOINT */}
          <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-sm text-center space-y-2">
            <div className="flex justify-center">
              {/* Custom SVG Github logo */}
              <svg
                className="w-8 h-8 text-slate-800"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z"
                />
              </svg>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800">GitHub Raw</h4>
              <p className="text-[8px] text-slate-400 mt-0.5">
                Style guideline markdown
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
