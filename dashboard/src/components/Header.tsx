export function Header() {
  return (
    <header className="bg-[#1a1a1a] border-b border-[#2a2a2a] px-8 py-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-[#E8995C] to-[#D4915F] rounded-2xl flex items-center justify-center shadow-glow overflow-hidden">
            <img src="/IMG_3987.jpg" alt="Payload Pipeline Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Payload Pipeline</h1>
            <p className="text-sm text-[#9ca3af]">Mission Control</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="w-10 h-10 rounded-full bg-[#2a2a2a] hover:bg-[#333333] flex items-center justify-center text-[#9ca3af] hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </button>
          <div className="w-2 h-2 rounded-full bg-[#10b981]" title="System Online" />
        </div>
      </div>
    </header>
  );
}
