function FileUpload({ 
  file,
  preview,
  onFileChange,
  accept = "image/*",
  label = "Choose Image",
  previewSize = "w-16 h-16",
  className = ""
}) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {preview && (
        <img
          src={preview}
          alt="Preview"
          className={`${previewSize} rounded-full object-cover border-2 border-[#5865F2]`}
        />
      )}
      <label className="cursor-pointer">
        <input
          type="file"
          accept={accept}
          onChange={onFileChange}
          className="hidden"
        />
        <div className="bg-[#40444B] hover:bg-[#36393F] text-[#B9BBBE] px-4 py-2 rounded-lg border border-[#40444B] transition-colors">
          {label}
        </div>
      </label>
    </div>
  )
}

export default FileUpload