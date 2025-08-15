function Sidebar() {
  const channels = [
    { id: 1, name: 'general', type: 'text' },
    { id: 2, name: 'ai-playground', type: 'text' },
    { id: 3, name: 'bot-central', type: 'text' }
  ]

  return (
    <aside className="bg-[#2F3136] w-60 flex flex-col">
      {/* Server Header */}
      <div className="bg-[#202225] px-4 py-3 border-b border-[#40444B]">
        <h2 className="text-[#FFFFFF] font-semibold">ChatterBox Server</h2>
      </div>

      {/* Channels */}
      <div className="flex-1 p-2">
        <div className="mb-4">
          <h3 className="text-[#8E9297] text-xs font-semibold uppercase mb-2 px-2">
            Text Channels
          </h3>
          {channels.map(channel => (
            <div 
              key={channel.id}
              className="flex items-center gap-2 px-2 py-1 rounded hover:bg-[#40444B] cursor-pointer group"
            >
              <span className="text-[#8E9297]">#</span>
              <span className="text-[#B9BBBE] group-hover:text-[#FFFFFF]">
                {channel.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}

export default Sidebar