import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ExpiringMaterial {
  id: string;
  materialInventoryId: string;
  batchNumber: string;
  expiryDate: Date;
  quantity: string;
}

interface ExpiringMaterialsProps {
  materials: ExpiringMaterial[];
}

function getDaysUntilExpiry(expiryDate: Date): number {
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diff = expiry.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function ExpiringMaterials({ materials }: ExpiringMaterialsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Expiring Materials (Next 30 Days)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {materials.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No materials expiring soon
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {materials.map((material) => {
              const daysLeft = getDaysUntilExpiry(material.expiryDate);
              const isCritical = daysLeft <= 7;
              const isWarning = daysLeft > 7 && daysLeft <= 14;

              return (
                <Alert
                  key={material.id}
                  variant={isCritical ? 'destructive' : 'default'}
                  className={
                    isWarning ? 'border-yellow-500' : isCritical ? '' : 'border-blue-500'
                  }
                >
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="ml-2">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium">
                          Batch: {material.batchNumber}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Quantity: {parseFloat(material.quantity)} units
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Expires:{' '}
                          {new Date(material.expiryDate).toLocaleDateString()}
                        </div>
                      </div>
                      <Badge
                        variant={
                          isCritical
                            ? 'destructive'
                            : isWarning
                              ? 'outline'
                              : 'secondary'
                        }
                        className={
                          isWarning
                            ? 'border-yellow-500 text-yellow-700'
                            : !isCritical
                              ? 'bg-blue-100 text-blue-800'
                              : ''
                        }
                      >
                        {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
                      </Badge>
                    </div>
                  </AlertDescription>
                </Alert>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
