'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, Upload, FileText, Image as ImageIcon, File as GenericFile, Download, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

interface FileItem {
  id: string
  name: string
  size: string
  type: string
  date: string
}

function getCsrfHeader(): Record<string, string> {
  const match = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]*)/)
  return match ? { 'x-csrf-token': match[1] } : {}
}

function getFileIcon(type: string) {
  if (type.startsWith('text/')) return <FileText className="h-5 w-5 text-gray-500" />
  if (type.startsWith('image/')) return <ImageIcon className="h-5 w-5 text-gray-500" />
  return <GenericFile className="h-5 w-5 text-gray-500" />
}

function formatSize(bytes: number): string {
  return `${Math.round(bytes / 1024)} KB`
}

export default function VaultPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<FileItem[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const res = await fetch('/api/vault')
        if (!res.ok) throw new Error('Failed to fetch files')
        const data = await res.json()
        const mapped: FileItem[] = (data.files || []).map((f: any) => ({
          id: f.id,
          name: f.originalName,
          size: formatSize(f.size),
          type: f.mimeType,
          date: new Date(f.createdAt).toLocaleDateString()
        }))
        setFiles(mapped)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchFiles()
  }, [])

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files
    if (!selected) return
    try {
      for (const file of Array.from(selected)) {
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch('/api/vault', {
          method: 'POST',
          headers: getCsrfHeader(),
          body: formData,
        })
        if (!res.ok) throw new Error('Upload failed')
        const { file: uploadedRecord } = await res.json()
        setFiles((prev) => [...prev, {
          id: uploadedRecord.id,
          name: uploadedRecord.originalName,
          size: formatSize(uploadedRecord.size),
          type: uploadedRecord.mimeType,
          date: new Date(uploadedRecord.createdAt).toLocaleDateString()
        }])
      }
    } catch (err) {
      console.error(err)
    } finally {
      e.target.value = ''
    }
  }

  const handleDownload = (file: FileItem) => {
    const link = document.createElement('a')
    link.href = `/api/vault/${file.id}`
    link.download = file.name
    link.click()
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/vault/${id}`, {
        method: 'DELETE',
        headers: getCsrfHeader(),
      })
      if (!res.ok) throw new Error('Delete failed')
      setFiles((prev) => prev.filter((f) => f.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="p-6 flex-1 overflow-auto">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Vault</h1>
        <div className="flex items-center gap-3">
          <div className="relative max-w-xs">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Search files..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={handleUploadClick}>
            <Upload className="h-4 w-4 mr-1" />
            Upload
          </Button>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelected} />
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <span className="animate-pulse text-gray-500">Loading files...</span>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-gray-500">
          <GenericFile className="h-12 w-12 mb-4" />
          <p className="text-lg">No files uploaded yet. Upload your first file.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full table-auto border-collapse">
            <thead className="bg-gray-200 dark:bg-gray-800/50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-200">Name</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-200">Type</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-200">Size</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-200">Date</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-200">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFiles.map((file) => (
                <tr key={file.id} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      {getFileIcon(file.type)}
                      <span className="text-gray-900 dark:text-gray-100">{file.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">{file.type}</td>
                  <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">{file.size}</td>
                  <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">{file.date}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleDownload(file)} aria-label={`Download ${file.name}`}>
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(file.id)} aria-label={`Delete ${file.name}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
