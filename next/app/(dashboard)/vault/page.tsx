'use client'

import { useState, useRef } from 'react'
import { Search, Upload, FileText, Image as ImageIcon, File as GenericFile, Download, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const placeholderFiles = [
  { id: '1', name: 'document.txt', size: '12 KB', type: 'text/plain', date: '2026-01-15' },
  { id: '2', name: 'image.png', size: '234 KB', type: 'image/png', date: '2026-01-14' },
]

type FileItem = {
  id: string
  name: string
  size: string
  type: string
  date: string
}

function getFileIcon(type: string) {
  if (type.startsWith('text/')) {
    return <FileText className="h-5 w-5 text-gray-500" />
  }
  if (type.startsWith('image/')) {
    return <ImageIcon className="h-5 w-5 text-gray-500" />
  }
  return <GenericFile className="h-5 w-5 text-gray-500" />
}

function formatSize(bytes: number): string {
  return `${Math.round(bytes / 1024)} KB`
}

export default function VaultPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<FileItem[]>(placeholderFiles)
  const [search, setSearch] = useState('')

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files
    if (!selected) return

    const newFiles: FileItem[] = Array.from(selected).map((file, idx) => ({
      id: `${Date.now()}-${idx}`,
      name: file.name,
      size: formatSize(file.size),
      type: file.type || 'application/octet-stream',
      date: new Date().toISOString().split('T')[0],
    }))

    setFiles((prev) => [...prev, ...newFiles])
    e.target.value = ''
  }

  const handleDownload = (file: FileItem) => {
    // placeholder: real implementation would fetch from server
    console.log('Download', file)
  }

  const handleDelete = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  return (
    <div className="p-6 flex-1 overflow-auto">
      {/* Page header */}
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Vault
        </h1>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative max-w-xs">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search files..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(
                'w-full pl-9 pr-3 py-1.5 rounded-md text-sm',
                'bg-gray-100 dark:bg-gray-800',
                'text-gray-900 dark:text-gray-100',
                'placeholder:text-gray-400 dark:placeholder:text-gray-500',
                'focus:outline-none focus:ring-2 focus:ring-blue-500'
              )}
            />
          </div>

          {/* Upload */}
          <button
            onClick={handleUploadClick}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium',
              'bg-blue-600 text-white hover:bg-blue-700',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
            )}
          >
            <Upload className="h-4 w-4" />
            Upload
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelected}
          />
        </div>
      </header>

      {/* Content */}
      {filteredFiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-gray-500">
          <GenericFile className="h-12 w-12 mb-4" />
          <p className="text-lg">No files uploaded yet. Upload your first file.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full table-auto border-collapse">
            <thead className="bg-gray-200 dark:bg-gray-800/50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-200">
                  Name
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-200">
                  Type
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-200">
                  Size
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-200">
                  Date
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-200">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredFiles.map((file) => (
                <tr
                  key={file.id}
                  className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                >
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      {getFileIcon(file.type)}
                      <span className="text-gray-900 dark:text-gray-100">
                        {file.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                    {file.type}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                    {file.size}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                    {file.date}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDownload(file)}
                        className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
                        aria-label={`Download ${file.name}`}
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(file.id)}
                        className="p-1 text-gray-500 hover:text-red-600 transition-colors"
                        aria-label={`Delete ${file.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
