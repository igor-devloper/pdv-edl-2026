"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function NomeCompradorDialog(props: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onConfirm: (nome: string) => void
  carregando?: boolean
}) {
  const { open, onOpenChange, onConfirm, carregando } = props
  const [nome, setNome] = React.useState("")

  React.useEffect(() => {
    if (!open) setNome("")
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>Nome do comprador</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <Label>Digite o nome (opcional)</Label>
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: João Silva"
            className="rounded-xl"
          />
          <p className="text-xs text-muted-foreground">
            Isso ajuda o controle no dashboard.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            className="rounded-xl"
            disabled={!!carregando}
            onClick={() => onConfirm(nome.trim())}
          >
            Continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
