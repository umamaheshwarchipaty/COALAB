import { useState } from 'react'

export function CertificatesPage() {
  const [verifyCode, setVerifyCode] = useState('')

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Course Certificates</h1>
      <p className="text-slate-600 mb-8">Claim your course completion certificate or verify an existing one.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Issue Certificate Section */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-900">My Certificate</h2>
          </div>
          <p className="text-slate-600 mb-6 text-sm flex-grow">
            Once you complete all required modules and pass the module-end quizzes with the minimum required score, you can generate your official certificate here.
          </p>
          <div className="bg-slate-50 p-4 rounded-lg mb-6 border border-slate-100">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-slate-700">Current Status:</span>
              <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">In Progress</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div className="bg-amber-500 h-2 rounded-full" style={{ width: '60%' }}></div>
            </div>
          </div>
          <button className="w-full py-2.5 bg-slate-200 text-slate-500 text-sm font-medium rounded-lg cursor-not-allowed transition">
            Generate Certificate (Locked)
          </button>
        </div>

        {/* Verify Certificate Section */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-900">Verify Certificate</h2>
          </div>
          <p className="text-slate-600 mb-6 text-sm">
            Employers and institutions can verify the authenticity of a COA Interactive Learning Lab certificate by entering the unique certificate code below.
          </p>
          <div className="flex-grow">
            <label htmlFor="cert-code" className="block text-sm font-medium text-slate-700 mb-1">Certificate Code</label>
            <input
              type="text"
              id="cert-code"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="e.g. CERT-1234-ABCD"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value)}
            />
          </div>
          <button className="w-full mt-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition">
            Verify Authenticity
          </button>
        </div>
      </div>
    </div>
  )
}