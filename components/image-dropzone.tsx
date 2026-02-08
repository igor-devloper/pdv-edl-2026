"use client"

import { useCallback, useState } from "react"
import { Upload, X, ImageIcon } from "lucide-react"
import { Button } from "./ui/button"

type Props = {
  value: string | null
  onChange: (url: string | null) => void
  disabled?: boolean
}

export function ImageDropzone({ value, onChange, disabled }: Props) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(value)

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      // Validar tipo
      if (!file.type.startsWith("image/")) {
        alert("Por favor, selecione uma imagem")
        return
      }

      // Validar tamanho (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("Imagem muito grande! Máximo 5MB")
        return
      }

      setUploading(true)

      try {
        // Converter para base64 para preview
        const reader = new FileReader()
        reader.onload = () => {
          setPreview(reader.result as string)
        }
        reader.readAsDataURL(file)

        // Upload para servidor
        const formData = new FormData()
        formData.append("file", file)

        const res = await fetch("/api/upload-image", {
          method: "POST",
          body: formData,
        })

        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Erro no upload")

        onChange(data.url)
      } catch (error: any) {
        alert(error.message || "Erro ao fazer upload")
        setPreview(null)
      } finally {
        setUploading(false)
      }
    },
    [onChange]
  )

  const handleRemove = () => {
    setPreview(null)
    onChange(null)
  }

  return (
    <div className="space-y-2">
      {preview ? (
        <div className="relative group rounded-2xl overflow-hidden border-2 border-red-100 bg-gradient-to-br from-red-50 to-pink-50">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-48 object-cover"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="rounded-full"
              onClick={handleRemove}
              disabled={disabled || uploading}
            >
              <X className="h-4 w-4 mr-1.5" />
              Remover
            </Button>
          </div>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-red-200 rounded-2xl bg-gradient-to-br from-red-50/50 to-pink-50/50 cursor-pointer hover:border-red-400 hover:bg-red-50 transition-all group">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={disabled || uploading}
          />
          <div className="flex flex-col items-center gap-2 text-gray-500 group-hover:text-red-600 transition-colors">
            {uploading ? (
              <>
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
                <p className="text-sm font-semibold">Enviando...</p>
              </>
            ) : (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 group-hover:bg-red-200 transition-colors">
                  <Upload className="h-6 w-6 text-red-600" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold">Clique para enviar</p>
                  <p className="text-xs text-gray-400">PNG, JPG até 5MB</p>
                </div>
              </>
            )}
          </div>
        </label>
      )}
    </div>
  )
}