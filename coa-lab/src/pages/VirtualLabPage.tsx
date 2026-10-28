
export function VirtualLabPage() {
  const labs = [
    { id: 1, title: 'Logic Gates & Combinational Circuits', type: 'Simulator', desc: 'Build and test basic logic gates, multiplexers, and decoders interactively.' },
    { id: 2, title: 'ALU (Arithmetic Logic Unit) Design', type: 'Simulator', desc: 'Simulate 4-bit and 8-bit arithmetic and bitwise logic operations.' },
    { id: 3, title: 'Cache Memory Mapping', type: 'Visualizer', desc: 'Visualize direct, associative, and set-associative cache mapping techniques.' },
    { id: 4, title: 'MIPS Pipelining Execution', type: 'Interactive Video', desc: 'Step-by-step breakdown of instruction fetch, decode, and execute cycles.' },
  ]

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Virtual Lab</h1>
      <p className="text-slate-600 mb-8">Access interactive simulators and visualizers to practice COA concepts hands-on.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {labs.map((lab) => (
          <div key={lab.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-semibold text-lg text-slate-900">{lab.title}</h3>
              <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                {lab.type}
              </span>
            </div>
            <p className="text-slate-600 text-sm flex-grow mb-6">{lab.desc}</p>
            <button className="w-full py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition">
              Launch {lab.type}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}