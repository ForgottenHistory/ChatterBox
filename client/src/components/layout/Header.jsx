function Header() {
  return (
    <header className="bg-[#202225] border-b border-[#40444B] px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h1 className="text-[#FFFFFF] text-xl font-semibold">ChatterBox</h1>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="text-[#B9BBBE] text-sm">Welcome back!</div>
      </div>
    </header>
  )
}

export default Header