
export function ExamPrepPage() {
  const studyRoute = [
    { id: 1, title: 'Phase 1: Core Modules Revision', desc: 'Review Modules 1-4 lecture notes and slides.', status: 'current' },
    { id: 2, title: 'Phase 2: Practice Quizzes', desc: 'Score at least 80% on all module-end quizzes.', status: 'pending' },
    { id: 3, title: 'Phase 3: Previous Year Questions (PYQs)', desc: 'Solve verified past papers from the pyq_resources database.', status: 'pending' },
    { id: 4, title: 'Phase 4: Mock Tests', desc: 'Take full-length timed mock exams.', status: 'pending' },
  ]

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Exam Preparation Roadmap</h1>
      <p className="text-slate-600 mb-8">Follow this structured path to ace your COA exams.</p>
      
      <div className="relative border-l-2 border-slate-200 ml-3 md:ml-4">
        {studyRoute.map((step) => (
          <div key={step.id} className="mb-10 ml-6">
            <span className={`absolute flex items-center justify-center w-6 h-6 rounded-full -left-3 ring-4 ring-white ${step.status === 'current' ? 'bg-blue-600' : 'bg-slate-300'}`}>
              <span className="text-white text-xs font-bold">{step.id}</span>
            </span>
            <h3 className="font-semibold text-lg text-slate-900">{step.title}</h3>
            <p className="text-slate-600 mt-1">{step.desc}</p>
            {step.id === 3 && (
              <button className="mt-3 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-800 transition">
                Browse PYQs Database
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}