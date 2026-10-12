import { Hash, ListOrdered } from 'lucide-react'
import { CODE_LENGTH, EXAMPLE_CODE } from '../lib/numbering'
import { Button, Card } from './ui'

interface Props {
  recipientCount: number
  missingCount: number
  onFillMissing: () => void
  onRenumberAll: () => void
}

export function CertificateNumberSettings({ recipientCount, missingCount, onFillMissing, onRenumberAll }: Props) {
  return (
    <Card
      title="Certificate numbering"
      description={`Each new number is ${CODE_LENGTH} random lowercase letters and digits, like ${EXAMPLE_CODE}. Numbers you type or import are kept unless you renumber all.`}
    >
      <div className="flex flex-wrap gap-2">
        <Button icon={Hash} disabled={!missingCount} onClick={onFillMissing}>
          Fill missing numbers{missingCount ? ` (${missingCount})` : ''}
        </Button>
        <Button variant="ghost" icon={ListOrdered} disabled={!recipientCount} onClick={onRenumberAll}>
          Renumber all…
        </Button>
      </div>
    </Card>
  )
}
